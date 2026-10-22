(() => {
  const apiBaseUrl = window.PORTFOLIO.visitorLog?.apiBaseUrl?.trim().replace(/\/+$/, "");
  const loginPanel = document.querySelector("#admin-login-panel");
  const dashboard = document.querySelector("#admin-dashboard");
  const loginForm = document.querySelector("#admin-login-form");
  const loginMessage = document.querySelector("#admin-login-message");
  const dataMessage = document.querySelector("#admin-data-message");
  const passwordInput = document.querySelector("#admin-password");
  const periodInput = document.querySelector("#visit-period");
  const monthFilter = document.querySelector("#visit-month-filter");
  const monthInput = document.querySelector("#visit-month");
  const rowContainer = document.querySelector("#visit-rows");
  let token = null;
  let page = 1;
  let totalPages = 1;
  let loadRequestId = 0;

  const apiRequest = async (path, options = {}) => {
    if (!apiBaseUrl) throw new Error("Visitor API URL is not configured.");
    const apiUrl = new URL(apiBaseUrl);
    const localApi = ["localhost", "127.0.0.1"].includes(apiUrl.hostname);
    if (
      apiUrl.origin !== apiBaseUrl ||
      (apiUrl.protocol !== "https:" && !(localApi && apiUrl.protocol === "http:"))
    ) {
      throw new Error("Admin sign-in requires an HTTPS visitor API (HTTP is allowed only for localhost).");
    }
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      },
      credentials: "omit",
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return result;
  };

  const formatDuration = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0) return "—";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours) return `${hours}h ${remainingMinutes}m`;
    if (minutes) return `${minutes}m ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
  };

  const formatIndiaTimestamp = value => {
    if (!value) return "Still active";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata"
      }).format(date);
  };

  const addCell = (row, value) => {
    const cell = document.createElement("td");
    cell.textContent = value == null || value === "" ? "—" : String(value);
    row.append(cell);
  };

  const renderVisits = visits => {
    rowContainer.replaceChildren();
    if (!visits.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 9;
      cell.textContent = "No visits found for this selection.";
      row.append(cell);
      rowContainer.append(row);
      return;
    }
    visits.forEach(visit => {
      const row = document.createElement("tr");
      addCell(row, visit.visit_id);
      addCell(row, visit.day_and_date);
      addCell(row, visit.entry_time);
      addCell(row, visit.ip_address);
      addCell(row, visit.page_path);
      addCell(row, visit.status);
      addCell(row, formatIndiaTimestamp(visit.estimated_exit_at));
      addCell(row, formatDuration(visit.estimated_duration_seconds));
      addCell(row, formatIndiaTimestamp(visit.last_activity_at));
      rowContainer.append(row);
    });
  };

  const loadVisits = async () => {
    const requestId = ++loadRequestId;
    dataMessage.textContent = "Loading visitor records...";
    document.querySelector("#previous-page").disabled = true;
    document.querySelector("#next-page").disabled = true;
    const query = new URLSearchParams({ page: String(page) });
    if (periodInput.value === "month") query.set("month", monthInput.value);
    try {
      const result = await apiRequest(`/api/admin/visits?${query}`);
      if (requestId !== loadRequestId) return;
      document.querySelector("#total-visits").textContent = result.totalVisits.toLocaleString();
      document.querySelector("#filtered-visits").textContent = result.filteredVisits.toLocaleString();
      document.querySelector("#filtered-label").textContent = periodInput.value === "month"
        ? `Visits in ${monthInput.value}`
        : "Visits overall";
      totalPages = Math.max(1, result.totalPages);
      renderVisits(result.visits);
      document.querySelector("#page-indicator").textContent = `Page ${result.page} of ${totalPages}`;
      document.querySelector("#previous-page").disabled = result.page <= 1;
      document.querySelector("#next-page").disabled = result.page >= totalPages;
      dataMessage.textContent = "";
    } catch (error) {
      if (requestId !== loadRequestId) return;
      if (error.status === 401) {
        token = null;
        dashboard.hidden = true;
        loginPanel.hidden = false;
        loginMessage.textContent = error.message;
        return;
      }
      dataMessage.textContent = error.message;
      console.error("Could not load visitor records.", error);
    }
  };

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    loginMessage.textContent = "Signing in...";
    try {
      const result = await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password: passwordInput.value })
      });
      if (typeof result.token !== "string" || !result.token) {
        throw new Error("The API did not return an admin session.");
      }
      token = result.token;
      passwordInput.value = "";
      page = 1;
      loginPanel.hidden = true;
      dashboard.hidden = false;
      await loadVisits();
    } catch (error) {
      loginMessage.textContent = error.message;
      console.error("Admin sign-in failed.", error);
    } finally {
      submitButton.disabled = false;
    }
  });

  document.querySelector("#admin-logout").addEventListener("click", () => {
    loadRequestId += 1;
    token = null;
    page = 1;
    dashboard.hidden = true;
    loginPanel.hidden = false;
    loginMessage.textContent = "You have signed out.";
    rowContainer.replaceChildren();
  });

  monthInput.addEventListener("change", () => {
    page = 1;
    loadVisits();
  });
  periodInput.addEventListener("change", () => {
    const isMonthFilter = periodInput.value === "month";
    monthFilter.hidden = !isMonthFilter;
    if (isMonthFilter && !monthInput.value) {
      monthInput.value = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 7);
    }
    page = 1;
    loadVisits();
  });
  document.querySelector("#previous-page").addEventListener("click", () => {
    if (page > 1) {
      page -= 1;
      loadVisits();
    }
  });
  document.querySelector("#next-page").addEventListener("click", () => {
    if (page < totalPages) {
      page += 1;
      loadVisits();
    }
  });
})();
