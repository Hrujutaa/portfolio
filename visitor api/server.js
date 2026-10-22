import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const requiredEnvironment = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SITE_ORIGINS"];
for (const name of requiredEnvironment) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const adminPassword = process.env.ADMIN_PASSWORD;
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET;
if (Boolean(adminPassword) !== Boolean(adminSessionSecret)) {
  throw new Error("Set both ADMIN_PASSWORD and ADMIN_SESSION_SECRET to enable admin access.");
}
if (adminPassword && adminPassword.length < 16) {
  throw new Error("ADMIN_PASSWORD must be at least 16 characters long.");
}
if (adminSessionSecret && adminSessionSecret.length < 32) {
  throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters long.");
}

const allowedOrigins = process.env.SITE_ORIGINS.split(",").map(value => value.trim()).filter(Boolean);
for (const origin of allowedOrigins) {
  const parsed = new URL(origin);
  const localOrigin = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (
    parsed.origin !== origin ||
    (parsed.protocol !== "https:" && !(localOrigin && parsed.protocol === "http:"))
  ) {
    throw new Error(`SITE_ORIGINS must contain only exact origins; invalid value: ${origin}`);
  }
}
if (allowedOrigins.length === 0) throw new Error("SITE_ORIGINS must contain at least one website origin.");

const retentionDays = Number(process.env.VISIT_RETENTION_DAYS || 90);
if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
  throw new Error("VISIT_RETENTION_DAYS must be an integer between 1 and 3650.");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const app = express();
const visitIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use("/api", (request, response, next) => {
  if (!allowedOrigins.includes(request.get("origin"))) {
    return response.status(403).json({ error: "Origin is not allowed." });
  }
  next();
});
app.use("/api", cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600
}));
app.use(express.json({ limit: "2kb" }));

const startLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false
});
const activityLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false
});
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

const signAdminPayload = payload =>
  createHmac("sha256", adminSessionSecret).update(payload).digest("base64url");

const createAdminToken = () => {
  const payload = Buffer.from(JSON.stringify({
    sub: "admin",
    exp: Date.now() + 60 * 60 * 1000,
    nonce: randomUUID()
  })).toString("base64url");
  return `${payload}.${signAdminPayload(payload)}`;
};

const isValidAdminToken = token => {
  if (typeof token !== "string") return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(payload)) return false;

  const expectedSignature = Buffer.from(signAdminPayload(payload));
  const providedSignature = Buffer.from(signature);
  if (
    providedSignature.length !== expectedSignature.length ||
    !/^[A-Za-z0-9_-]+$/.test(signature) ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.sub === "admin" && Number.isSafeInteger(claims.exp) && claims.exp > Date.now();
  } catch {
    return false;
  }
};

const requireAdmin = (request, response, next) => {
  response.set("Cache-Control", "no-store");
  if (!adminPassword || !adminSessionSecret) {
    return response.status(503).json({ error: "Admin access is not configured on the server." });
  }
  const authorization = request.get("authorization") || "";
  const token = authorization.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];
  if (!isValidAdminToken(token)) {
    return response.status(401).json({ error: "Your admin session is invalid or expired. Please sign in again." });
  }
  next();
};

const validPagePath = value =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 200 &&
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !/[?#\u0000-\u001f]/.test(value);

const validVisitId = value => typeof value === "string" && visitIdPattern.test(value);

app.get("/healthz", (_request, response) => response.status(200).json({ status: "ok" }));

app.get("/api/visits/count", activityLimiter, async (_request, response) => {
  const { count, error } = await supabase
    .from("visitor_sessions")
    .select("visit_id", { count: "exact", head: true });
  if (error) {
    console.error("Failed to count visitor sessions:", error);
    return response.status(500).json({ error: "Could not retrieve the visitor count." });
  }
  return response.status(200).json({ visitCount: count });
});

app.post("/api/admin/login", adminLoginLimiter, (request, response) => {
  response.set("Cache-Control", "no-store");
  if (!adminPassword || !adminSessionSecret) {
    return response.status(503).json({ error: "Admin access is not configured on the server." });
  }
  const { password } = request.body || {};
  if (typeof password !== "string" || password.length > 1024) {
    return response.status(400).json({ error: "Enter a valid admin password." });
  }
  const expectedPasswordHash = createHmac("sha256", adminSessionSecret).update(adminPassword).digest();
  const providedPasswordHash = createHmac("sha256", adminSessionSecret).update(password).digest();
  if (!timingSafeEqual(providedPasswordHash, expectedPasswordHash)) {
    return response.status(401).json({ error: "The admin password is incorrect." });
  }
  return response.status(200).json({ token: createAdminToken(), expiresIn: 3600 });
});

app.get("/api/admin/visits", activityLimiter, requireAdmin, async (request, response) => {
  const month = request.query.month;
  if (month !== undefined && (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))) {
    return response.status(400).json({ error: "Choose a valid month in YYYY-MM format." });
  }
  const page = request.query.page === undefined ? 1 : Number(request.query.page);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) {
    return response.status(400).json({ error: "Page must be a positive integer." });
  }

  const pageSize = 50;
  const offset = (page - 1) * pageSize;
  let visitsQuery = supabase
    .from("visitor_log")
    .select(
      "visit_id, ip_address, page_path, day_and_date, entry_time, entry_at, estimated_exit_at, estimated_duration_seconds, status, last_activity_at",
      { count: "exact" }
    )
    .order("entry_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (month) {
    const [year, monthNumber] = month.split("-").map(Number);
    const indiaOffset = 5.5 * 60 * 60 * 1000;
    const start = new Date(Date.UTC(year, monthNumber - 1, 1) - indiaOffset);
    const end = new Date(Date.UTC(year, monthNumber, 1) - indiaOffset);
    visitsQuery = visitsQuery.gte("entry_at", start.toISOString()).lt("entry_at", end.toISOString());
  }

  const totalQuery = supabase
    .from("visitor_sessions")
    .select("visit_id", { count: "exact", head: true });
  const [{ data, count, error }, { count: totalVisits, error: totalError }] = await Promise.all([
    visitsQuery,
    totalQuery
  ]);
  if (error || totalError) {
    console.error("Failed to retrieve admin visitor records:", error || totalError);
    return response.status(500).json({ error: "Could not retrieve visitor records." });
  }
  return response.status(200).json({
    totalVisits,
    filteredVisits: count,
    visits: data,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  });
});

app.post("/api/visits", startLimiter, async (request, response) => {
  const { pagePath } = request.body || {};
  if (!validPagePath(pagePath)) return response.status(400).json({ error: "A valid pagePath is required." });
  if (!request.ip) return response.status(400).json({ error: "The visitor IP address could not be determined." });

  const { data, error } = await supabase
    .from("visitor_sessions")
    .insert({ ip_address: request.ip, page_path: pagePath })
    .select("visit_id")
    .single();
  if (error) {
    console.error("Failed to insert visitor session:", error);
    return response.status(500).json({ error: "Could not record the visitor session." });
  }
  return response.status(201).json({ visitId: data.visit_id });
});

app.post("/api/visits/:visitId/activity", activityLimiter, async (request, response) => {
  const { visitId } = request.params;
  const { pagePath } = request.body || {};
  if (!validVisitId(visitId)) return response.status(400).json({ error: "A valid visit ID is required." });
  if (!validPagePath(pagePath)) return response.status(400).json({ error: "A valid pagePath is required." });

  const activeSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("visitor_sessions")
    .update({ page_path: pagePath })
    .eq("visit_id", visitId)
    .gt("last_activity_at", activeSince)
    .select("visit_id")
    .maybeSingle();
  if (error) {
    console.error("Failed to update visitor activity:", error);
    return response.status(500).json({ error: "Could not update visitor activity." });
  }
  if (!data) return response.status(409).json({ error: "This visitor session is inactive." });
  return response.status(204).end();
});

app.delete("/api/visits/:visitId", activityLimiter, async (request, response) => {
  const { visitId } = request.params;
  if (!validVisitId(visitId)) return response.status(400).json({ error: "A valid visit ID is required." });

  const { error } = await supabase.from("visitor_sessions").delete().eq("visit_id", visitId);
  if (error) {
    console.error("Failed to delete visitor session:", error);
    return response.status(500).json({ error: "Could not delete the visitor session." });
  }
  return response.status(204).end();
});

app.use((error, _request, response, _next) => {
  console.error("Unhandled visitor API error:", error);
  response.status(500).json({ error: "The visitor API encountered an error." });
});

const deleteExpiredSessions = async () => {
  try {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("visitor_sessions").delete().lt("started_at", cutoff);
    if (error) console.error("Failed to remove expired visitor sessions:", error);
  } catch (error) {
    console.error("Failed to remove expired visitor sessions:", error);
  }
};

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`Visitor log API listening on port ${port}.`);
  deleteExpiredSessions();
});
const retentionTimer = setInterval(deleteExpiredSessions, 24 * 60 * 60 * 1000);
retentionTimer.unref();

const shutdown = () => {
  clearInterval(retentionTimer);
  server.close(() => process.exit(0));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
