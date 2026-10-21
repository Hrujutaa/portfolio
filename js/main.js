(() => {
  const data = window.PORTFOLIO;
  const page = document.body.dataset.page || "home";
  const setupVisitorAnalytics = () => {
    const siteCode = data.analytics?.goatCounterCode?.trim();
    if (!siteCode || !/^https?:$/.test(window.location.protocol)) return;
    if (!/^[a-z0-9-]+$/i.test(siteCode)) {
      console.warn("GoatCounter site code must contain only letters, numbers, or hyphens.");
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.dataset.goatcounter = `https://${siteCode}.goatcounter.com/count`;
    document.head.append(script);
  };
  setupVisitorAnalytics();
  const setupVisitorLog = () => {
    const apiBaseUrl = data.visitorLog?.apiBaseUrl?.trim().replace(/\/+$/, "");
    if (!apiBaseUrl || !/^https?:$/.test(window.location.protocol)) return;
    try {
      const apiUrl = new URL(apiBaseUrl);
      const localApi = ["localhost", "127.0.0.1"].includes(apiUrl.hostname);
      if (
        apiUrl.origin !== apiBaseUrl ||
        (apiUrl.protocol !== "https:" && !(localApi && apiUrl.protocol === "http:"))
      ) {
        throw new Error("Visitor log API URL must be an HTTPS origin (HTTP is allowed only for localhost).");
      }

      const consentKey = "portfolio-visitor-log-consent";
      const visitKey = "portfolio-visitor-log-id";
      const inactivityTimeout = 5 * 60_000;
      let consent = localStorage.getItem(consentKey);
      let visitId = sessionStorage.getItem(visitKey);
      let heartbeat;
      let requestInProgress = false;
      let lastUserActivityAt = Date.now();

      const request = async (path, options = {}) => {
        const response = await fetch(`${apiBaseUrl}${path}`, {
          ...options,
          headers: { "Content-Type": "application/json", ...options.headers },
          credentials: "omit"
        });
        if (!response.ok) {
          const details = await response.json().catch(() => ({}));
          const error = new Error(details.error || `Visitor log request failed (${response.status}).`);
          error.status = response.status;
          throw error;
        }
        return response.status === 204 ? null : response.json();
      };

      const pagePath = () => window.location.pathname.slice(0, 200);
      const startVisit = async () => {
        if (consent !== "accepted") return;
        const result = await request("/api/visits", {
          method: "POST",
          body: JSON.stringify({ pagePath: pagePath() })
        });
        if (!result?.visitId) throw new Error("Visitor API response did not include a visit ID.");
        if (consent !== "accepted") {
          try {
            await request(`/api/visits/${encodeURIComponent(result.visitId)}`, { method: "DELETE" });
          } catch (error) {
            console.warn("Could not delete a visitor session after consent was withdrawn.", error);
          }
          return;
        }
        visitId = result.visitId;
        sessionStorage.setItem(visitKey, visitId);
      };
      const recordActivity = async () => {
        if (
          requestInProgress ||
          document.visibilityState === "hidden" ||
          consent !== "accepted" ||
          Date.now() - lastUserActivityAt > inactivityTimeout
        ) return;
        requestInProgress = true;
        try {
          if (!visitId) {
            await startVisit();
            return;
          }
          await request(`/api/visits/${encodeURIComponent(visitId)}/activity`, {
            method: "POST",
            body: JSON.stringify({ pagePath: pagePath() })
          });
        } catch (error) {
          if (consent !== "accepted") return;
          if (error.status === 409 || error.status === 404) {
            visitId = null;
            sessionStorage.removeItem(visitKey);
            try {
              await startVisit();
            } catch (startError) {
              console.warn("Could not start a visitor log session.", startError);
            }
          } else {
            console.warn("Could not update the visitor log.", error);
          }
        } finally {
          requestInProgress = false;
        }
      };

      const markUserActivity = () => {
        const wasInactive = Date.now() - lastUserActivityAt > inactivityTimeout;
        lastUserActivityAt = Date.now();
        if (wasInactive) recordActivity();
      };

      const stopRecording = () => {
        if (heartbeat) window.clearInterval(heartbeat);
        heartbeat = null;
        const idToDelete = visitId;
        visitId = null;
        sessionStorage.removeItem(visitKey);
        if (idToDelete) {
          request(`/api/visits/${encodeURIComponent(idToDelete)}`, { method: "DELETE" })
            .catch(error => console.warn("Could not delete the current visitor log session.", error));
        }
      };

      const startRecording = () => {
        if (consent !== "accepted" || heartbeat) return;
        lastUserActivityAt = Date.now();
        recordActivity();
        heartbeat = window.setInterval(recordActivity, 60_000);
      };

      const banner = document.createElement("section");
      banner.className = "visitor-consent";
      banner.setAttribute("aria-label", "Visitor log privacy settings");
      banner.hidden = consent === "accepted" || consent === "declined";
      banner.innerHTML = `
        <div class="visitor-consent-copy">
          <strong>Optional visitor log</strong>
          <p>If you allow it, this site records the IP address received by its server, the page visited, and visit times. Sessions are estimated inactive after 5 minutes and deleted after 90 days. You can change your choice in the footer.</p>
        </div>
        <div class="visitor-consent-actions">
          <button type="button" class="button button-primary" data-visitor-consent="accepted">Allow</button>
          <button type="button" class="button button-outline" data-visitor-consent="declined">No thanks</button>
        </div>`;
      document.body.append(banner);

      banner.addEventListener("click", event => {
        const choice = event.target.closest("[data-visitor-consent]")?.dataset.visitorConsent;
        if (!choice) return;
        consent = choice;
        localStorage.setItem(consentKey, consent);
        banner.hidden = true;
        if (consent === "accepted") {
          startRecording();
        } else {
          stopRecording();
        }
      });

      const settingsButton = document.querySelector(".visitor-log-settings");
      settingsButton?.addEventListener("click", () => {
        banner.hidden = false;
        banner.querySelector('[data-visitor-consent="accepted"]').textContent =
          consent === "accepted" ? "Keep allowing" : "Allow";
        banner.querySelector('[data-visitor-consent="declined"]').textContent =
          consent === "declined" ? "Keep declining" : "No thanks";
      });

      ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"].forEach(eventName => {
        document.addEventListener(eventName, markUserActivity, { passive: true });
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          lastUserActivityAt = Date.now();
          recordActivity();
        }
      });
      window.addEventListener("focus", () => {
        lastUserActivityAt = Date.now();
        recordActivity();
      });
      if (consent === "accepted") startRecording();
    } catch (error) {
      console.warn("Visitor log is unavailable.", error);
    }
  };
  const navItems = [
    ["Home", "index.html", "home"], ["About", "about.html", "about"],
    ["Education", "education.html", "education"],
    ["Skills", "skills.html", "skills"], ["Projects", "projects.html", "projects"],
    ["Certificates", "certificates.html", "certificates"],
    ["Career", "career.html", "career"], ["Contributions", "contributions.html", "contributions"],
    ["Gallery", "gallery.html", "gallery"], ["Contact", "contact.html", "contact"]
  ];
  const esc = (value = "") => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const hasContent = value => {
    const text = String(value ?? "").trim();
    return text !== "" && !/^(add\b|replace this\b|describe\b|placeholder\b)/i.test(text);
  };
  const link = (url, label, className = "text-link") => url
    ? `<a class="${className}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    : `<span class="${className} unavailable">${label} · unavailable</span>`;
  const tags = items => (items || []).map(item => `<span class="tag">${esc(item)}</span>`).join("");
  const resumeButton = () => data.resume
    ? `<a class="button button-outline" href="${esc(data.resume)}" download>Download resume <span>↓</span></a>`
    : "";
  const socials = () => data.socials.filter(item => item.url).map(item =>
    `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.label)} <span aria-hidden="true">↗</span></a>`).join("");

  document.querySelector("#site-header").innerHTML = `
    <a class="skip-link" href="#main-content">Skip to content</a>
    <div class="scroll-progress" aria-hidden="true"><span></span></div>
    <header class="navbar">
      <a class="brand" href="index.html" aria-label="${esc(data.name)} home"><span class="brand-mark">h.</span><span>Hrujuta</span></a>
      <button class="menu-toggle" aria-label="Open navigation" aria-expanded="false"><span></span><span></span></button>
      <nav class="nav-links" aria-label="Main navigation">${navItems.map(([label, href, id]) => `<a href="${href}"${page === id ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
      <button class="theme-toggle" type="button" aria-label="Switch color theme"><span class="theme-icon" aria-hidden="true">◐</span></button>
    </header>`;
  document.body.insertAdjacentHTML("afterbegin", '<div class="preloader" aria-hidden="true"><span class="brand-mark">h.</span><span>loading the workbench<span class="loading-dots">...</span></span></div>');
  window.setTimeout(() => document.querySelector(".preloader")?.classList.add("preloader-done"), 320);
  document.querySelector("#site-footer").innerHTML = `
    <footer class="footer"><div class="footer-main"><a class="brand" href="index.html"><span class="brand-mark">h.</span><span>Hrujuta</span></a><p>Curious mind. Student builder. Future data storyteller.</p></div>
    <div class="footer-links"><a href="projects.html">Projects</a><a href="about.html">About</a><a href="contact.html">Get in touch</a>${data.visitorLog?.apiBaseUrl?.trim() ? '<button type="button" class="visitor-log-settings">Visitor log privacy</button>' : ""}</div>
    <p class="copyright">© <span data-year></span> ${esc(data.name)} <span class="footer-dot">·</span> Crafted with curiosity.</p></footer>
    <button class="back-top" aria-label="Back to top" type="button">↑</button>`;
  setupVisitorLog();

  const pageTitle = (eyebrow, title, intro) => `<section class="page-heading reveal"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lead">${intro}</p></section>`;
  const render = {
    home: () => `
      <section class="hero">
        <div class="hero-copy"><p class="eyebrow"><span class="status-dot"></span> OPEN TO LEARNING & COLLABORATION</p>
          <h1>Curious by nature.<br><span class="accent-text">Building with purpose.</span></h1>
          <p class="hero-name">I’m <strong>${esc(data.name)}</strong>.</p>
          <p class="hero-role">${esc(data.role)} <span class="role-separator">/</span> <span class="typing-role">future data storyteller</span></p>
          <p class="hero-intro">${esc(data.shortBio)}</p>
          <div class="button-row"><a class="button button-primary" href="projects.html">Explore my work <span>↗</span></a>${resumeButton()}<a class="button button-quiet" href="contact.html">Say hello</a></div>
          <div class="social-row">${socials()}</div>
        </div>
        <div class="hero-visual"><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div><div class="photo-frame"><img src="${esc(data.photo)}" alt="Portrait placeholder for ${esc(data.name)}" fetchpriority="high"><span class="photo-caption">currently growing <b>✳</b></span></div><div class="floating-note note-code"><span>01 / HELLO WORLD</span><code>curiosity<span class="mint">.build()</span></code></div><div class="floating-note note-location"><span>BASED IN</span><strong>Nagpur, IN</strong></div></div>
      </section>
      <section class="stats-strip reveal" aria-label="Portfolio highlights"><div><strong class="count-up" data-count="1">01</strong><span>chapter in progress</span></div><div><strong class="count-up" data-count="5">05</strong><span>tools in my kit</span></div><div><strong>∞</strong><span>things to learn</span></div><div><strong>${esc(data.careerInterest)}</strong><span>direction I’m exploring</span></div></section>
      <section class="home-menu section-block"><div class="section-heading reveal"><div><p class="eyebrow">THE PORTFOLIO MAP</p><h2>Get to know my <span class="accent-text">workbench.</span></h2></div><span class="section-index">01—${String(navItems.length - 1).padStart(2, "0")}</span></div><div class="menu-grid">${navItems.filter(([, , id]) => id !== "home").map(([label, href], i) => `<a class="menu-card reveal" href="${href}"><span class="menu-number">${String(i + 1).padStart(2, "0")}</span><span class="menu-card-arrow">↗</span><h3>${label}</h3><p>${menuDescriptions[i]}</p></a>`).join("")}</div></section>
      <section class="callout reveal"><div><p class="eyebrow">HAVE AN IDEA?</p><h2>Let’s make something <span class="accent-text">meaningful.</span></h2></div><a class="button button-primary" href="contact.html">Start a conversation ↗</a></section>`,
    about: () => `${pageTitle("A LITTLE CONTEXT", "More than a line of code.", "A student, a curious problem-solver, and a work in progress — in the best possible way.")}<section class="about-layout reveal"><div class="about-photo"><img src="${esc(data.photo)}" alt="Portrait placeholder for ${esc(data.name)}"><span class="image-label">FIG. 01 — THE HUMAN BEHIND THE SCREEN</span></div><div class="about-story"><p class="eyebrow">TELL ME ABOUT YOURSELF</p><h2>Hi, I’m ${esc(data.name.split(" ")[0])}.</h2><p>${esc(data.shortBio)}</p><p>I’m currently a third-year student at Symbiosis Institute of Technology, Nagpur. I enjoy learning by doing: breaking a problem into smaller parts, trying an idea, and improving it with each iteration.</p><p>My current curiosity lives around <strong>${esc(data.careerInterest)}</strong> — especially the ways data can help people see a problem more clearly.</p>${resumeButton()}</div></section><section class="section-block reveal"><div class="section-heading"><div><p class="eyebrow">A FEW HUMAN DETAILS</p><h2>Off-screen, I’m <span class="accent-text">still curious.</span></h2></div></div><div class="personality-grid"><article class="detail-card"><span class="detail-icon">✳</span><h3>What I enjoy</h3><p>Learning new tools, exploring data, and finding small ways to make ideas more useful.</p></article><article class="detail-card"><span class="detail-icon">↗</span><h3>Strengths I’m growing</h3><p>Curiosity, persistence, teamwork, and the willingness to ask one more question.</p></article><article class="detail-card"><span class="detail-icon">⌘</span><h3>What drives me</h3><p>Turning “I wonder if…” into something I can test, explain, and share.</p></article></div></section>`,
    education: () => {
      const educationItems = data.education.filter(item => hasContent(item.institution));
      const metrics = [
        ["CURRENT CGPA", data.academics.cgpa],
        ["10TH GRADE", data.academics.board10],
        ["12TH GRADE", data.academics.board12]
      ].filter(([, value]) => hasContent(value));
      return `${pageTitle("THE LEARNING TRAIL", "Education", "A timeline of the classrooms and communities that brought me here.")}<section class="timeline">${educationItems.map((item, i) => `<article class="timeline-item reveal"><div class="timeline-marker"><span>${String(i + 1).padStart(2, "0")}</span></div><div class="timeline-card"><div class="timeline-top"><span class="tag">${esc(item.level)}</span>${hasContent(item.years) ? `<span class="timeline-date">${esc(item.years)}</span>` : ""}</div><h2>${esc(item.institution)}</h2>${hasContent(item.board) ? `<p class="timeline-board">${esc(item.board)}</p>` : ""}${hasContent(item.score) ? `<div class="timeline-facts"><span><small>RESULT</small><strong>${esc(item.score)}</strong></span></div>` : ""}${hasContent(item.note) ? `<p>${esc(item.note)}</p>` : ""}</div></article>`).join("")}</section>${metrics.length ? `<section class="academic-highlights">${metrics.map(([label, value]) => `<article class="metric-card"><span class="eyebrow">${label}</span><strong>${esc(value)}</strong></article>`).join("")}</section>` : ""}`;
    },
    academics: () => render.education(),
    skills: () => `${pageTitle("TOOLS I’M BUILDING WITH", "Little tools, big ideas.", "Technical strengths, learning priorities, and the soft skills I bring to a team.")}<section class="section-block reveal"><div class="section-heading"><div><p class="eyebrow">TECHNICAL SKILLS</p><h2>Core tools and areas I’m working with.</h2></div></div><div class="logo-grid">${data.skills.map(skill => `<div class="logo-tile"><span>${esc(skill.icon)}</span><small>${esc(skill.name)}</small></div>`).join("")}</div></section><section class="section-block reveal"><div class="skills-layout"><div class="skills-panel">${data.technicalSkills.map(group => `<article class="skill-group"><div class="skill-group-title"><h2>${esc(group.category)}</h2><span>${group.items.length}</span></div><div class="tag-row">${group.items.map(item => `<span class="tag">${esc(item)}</span>`).join("")}</div></article>`).join("")}</div><div class="skills-panel"><article class="skill-group"><div class="skill-group-title"><h2>Currently learning</h2><span>${data.currentlyLearning.length}</span></div><div class="tag-row">${data.currentlyLearning.map(item => `<span class="tag">${esc(item)}</span>`).join("")}</div></article><article class="skill-group"><div class="skill-group-title"><h2>Soft skills</h2><span>${data.softSkills.length}</span></div><div class="tag-row">${data.softSkills.map(item => `<span class="tag">${esc(item)}</span>`).join("")}</div></article></div></div></section>`,
    projects: () => {
      const projects = data.projects.filter(project => hasContent(project.title) && hasContent(project.description));
      return `${pageTitle("SELECTED EXPERIMENTS", "Small ideas. Real learning.", "A living shelf of things I’ve made.")}${projects.length ? `<div class="filter-row" role="group" aria-label="Filter projects"><button class="filter-button active" data-filter="all">All work</button>${[...new Set(projects.map(p => p.category))].map(category => `<button class="filter-button" data-filter="${esc(category)}">${esc(category)}</button>`).join("")}</div><section class="project-grid">${projects.map((project, i) => `<article class="project-card reveal" data-category="${esc(project.category)}"><button class="project-open" data-project="${data.projects.indexOf(project)}" aria-label="View details for ${esc(project.title)}"><div class="project-image"><img src="${esc(project.image)}" alt="Project artwork for ${esc(project.title)}" loading="lazy"><span class="project-index">PROJECT / ${String(i + 1).padStart(2, "0")}</span></div><div class="project-content"><div class="project-card-top"><span class="tag">${esc(project.category)}</span>${project.status ? `<span class="tag">${esc(project.status)}</span>` : ""}<span>↗</span></div><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p>${project.note ? `<p class="project-note">${esc(project.note)}</p>` : ""}<div class="tag-row">${tags(project.stack.filter(hasContent))}</div></div></button><div class="project-links">${project.github ? link(project.github, "GitHub ↗") : ""} ${project.live ? link(project.live, "Live demo ↗") : ""}</div></article>`).join("")}</section>` : "<p class=\"empty-hint\">Projects will appear here.</p>"}<dialog class="detail-modal" id="project-modal"><button class="modal-close" aria-label="Close project details">×</button><div id="project-modal-content"></div></dialog>`;
    },
    certificates: () => {
      const certificates = data.certificates.filter(cert => hasContent(cert.title) && hasContent(cert.issuer));
      return `${pageTitle("PROOF OF CURIOSITY", "Learning, with receipts.", "Courses and credentials I’ve completed.")}${certificates.length ? `<div class="filter-row" role="group" aria-label="Filter certificates"><button class="filter-button active" data-filter="all">All certificates</button>${[...new Set(certificates.map(cert => cert.category))].map(category => `<button class="filter-button" data-filter="${esc(category)}">${esc(category)}</button>`).join("")}</div><section class="certificate-grid">${certificates.map((cert, i) => `<article class="certificate-card reveal" data-category="${esc(cert.category)}"><button class="certificate-open" data-certificate="${data.certificates.indexOf(cert)}" aria-label="Preview ${esc(cert.title)}"><img src="${esc(cert.image)}" alt="Certificate preview for ${esc(cert.title)}" loading="lazy"><span class="certificate-zoom">↗ Preview</span></button><div class="certificate-info"><span class="tag">${esc(cert.category)}</span><h2>${esc(cert.title)}</h2><p>${esc(cert.issuer)}${hasContent(cert.date) ? ` <span>·</span> ${esc(cert.date)}` : ""}</p>${cert.credential ? link(cert.credential, "View credential ↗") : ""}</div></article>`).join("")}</section><dialog class="detail-modal certificate-modal" id="certificate-modal"><button class="modal-close" aria-label="Close certificate preview">×</button><img id="certificate-preview" alt="Full certificate preview"><a id="certificate-download" class="button button-primary" download>Download certificate ↓</a></dialog>` : "<p class=\"empty-hint\">Certificates will appear here.</p>"}`;
    },
    career: () => {
      const internships = data.internships || [];
      return `${pageTitle("WHERE I’M HEADED", "A direction, not a destination.", "I’m building toward a career where careful analysis and useful technology meet.")}<section class="objective-card reveal"><span class="quote-mark">“</span><p>As a third-year student interested in <strong>${esc(data.careerInterest)}</strong>, my goal is to build strong foundations in programming, statistics, and data analysis — then use them to turn real-world questions into clear, useful insights.</p><span class="objective-caption">CURRENT CAREER OBJECTIVE</span></section><section class="section-block reveal"><div class="section-heading"><div><p class="eyebrow">AREAS I’M EXPLORING</p><h2>Curiosity has <span class="accent-text">many directions.</span></h2></div></div><div class="interest-grid">${data.interests.map((interest, i) => `<article class="interest-card"><span>0${i + 1}</span><h3>${esc(interest)}</h3><p>Learning the fundamentals and looking for meaningful ways to put them into practice.</p></article>`).join("")}</div></section><section class="career-status reveal"><div class="status-indicator"><span class="status-dot"></span> OPEN TO OPPORTUNITIES</div><h2>Ready to learn by <span class="accent-text">doing.</span></h2><p>Open to internships, collaborative projects, and opportunities to grow with a supportive team.</p><a class="button button-primary" href="contact.html">Let’s connect ↗</a></section><section class="section-block reveal"><div class="section-heading"><div><p class="eyebrow">INTERNSHIP</p><h2>Internship <span class="accent-text">experience.</span></h2></div></div>${internships.length ? `<div class="timeline">${internships.map((item, i) => `<article class="timeline-item"><div class="timeline-marker"><span>${String(i + 1).padStart(2, "0")}</span></div><div class="timeline-card"><div class="timeline-top"><span class="tag">${esc(item.role)}</span>${hasContent(item.period) ? `<span class="timeline-date">${esc(item.period)}</span>` : ""}</div><h2>${esc(item.organization)}</h2>${hasContent(item.description) ? `<p>${esc(item.description)}</p>` : ""}${Array.isArray(item.highlights) && item.highlights.length ? `<ul class="timeline-bullets">${item.highlights.map(highlight => `<li>${esc(highlight)}</li>`).join("")}</ul>` : ""}${item.certificate ? `<div class="internship-certificate"><img src="${esc(item.certificate.image)}" alt="${esc(item.certificate.title)}" loading="lazy"><div><small>${esc(item.certificate.issuer)}</small><p>${esc(item.certificate.title)}</p><span>${esc(item.certificate.date)}</span></div></div>` : ""}</div></article>`).join("")}</div>` : "<p>Internship details will appear here.</p>"}</section><section class="section-block"><p class="eyebrow">ROLES I’M INTERESTED IN</p><div class="tag-row">${tags(data.preferredRoles)}</div></section>`;
    },
    contributions: () => {
      const contributions = data.contributions.filter(item => hasContent(item.role) && hasContent(item.organization));
      return `${pageTitle("SHOWING UP", "Good work is a team sport.", "Experiences where I’ve helped connect people, contribute, and learn alongside others.")}${contributions.length ? `<section class="contribution-list">${contributions.map((item, i) => `<article class="contribution-card reveal"><div class="contribution-number">${String(i + 1).padStart(2, "0")}</div><img src="${esc(item.image)}" alt="Illustration for ${esc(item.organization)}" loading="lazy"><div class="contribution-copy">${hasContent(item.date) ? `<p class="eyebrow">${esc(item.date)}</p>` : ""}<h2>${esc(item.role)}</h2><h3>${esc(item.organization)}</h3><p>${esc(item.description)}</p></div></article>`).join("")}</section>` : "<p class=\"empty-hint\">Contributions will appear here.</p>"}`;
    },
    gallery: () => `${pageTitle("A FEW FRAMES", "The moments between milestones.", "A visual journal for campus life, making, and learning.")}<div class="filter-row" role="group" aria-label="Filter gallery"><button class="filter-button active" data-filter="all">Everything</button>${[...new Set(data.gallery.map(item => item.category))].map(category => `<button class="filter-button" data-filter="${esc(category)}">${esc(category)}</button>`).join("")}</div><section class="gallery-grid">${data.gallery.map((item, i) => `<button class="gallery-item reveal" data-gallery="${i}" data-category="${esc(item.category)}" aria-label="Open photograph: ${esc(item.title)}"><img src="${esc(item.image)}" alt="${esc(item.alt)}" loading="lazy"><span class="gallery-caption"><small>${esc(item.category)}</small><strong>${esc(item.title)}</strong></span></button>`).join("")}</section><dialog class="detail-modal gallery-modal" id="gallery-modal"><button type="button" class="modal-close" aria-label="Close gallery">×</button><button class="gallery-arrow gallery-prev" aria-label="Previous photo">←</button><img id="gallery-preview" alt=""><button class="gallery-arrow gallery-next" aria-label="Next photo">→</button><p id="gallery-caption"></p></dialog>`,
    contact: () => `${pageTitle("LET’S TALK", "A good conversation starts here.", "Have a question, an opportunity, or just want to talk about a project? Drop a note.")}<section class="contact-layout"><form class="contact-form" id="contact-form"><p class="eyebrow">SEND A NOTE <span class="required-note">* required</span></p><label for="form-name">Your name <span>*</span></label><input id="form-name" name="name" autocomplete="name" required minlength="2" placeholder="How should I address you?"><label for="form-email">Email address <span>*</span></label><input id="form-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"><label for="form-subject">Subject</label><input id="form-subject" name="subject" placeholder="What’s on your mind?"><label for="form-message">Message <span>*</span></label><textarea id="form-message" name="message" rows="5" required minlength="10" placeholder="A little context helps…"></textarea><button class="button button-primary" type="submit">Open email draft ↗</button><p class="form-note">This form opens your email app with the message filled in. No data is sent or stored on this site.</p><p class="form-status" aria-live="polite"></p></form><div class="contact-details"><p class="eyebrow">FIND ME HERE</p><a class="contact-card" href="${esc(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(data.email)}`)}" target="_blank" rel="noopener noreferrer"><span class="contact-symbol">@</span><span><small>PERSONAL EMAIL</small><strong>${esc(data.email)}</strong></span><b>↗</b></a><a class="contact-card" href="${esc(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(data.universityEmail)}`)}" target="_blank" rel="noopener noreferrer"><span class="contact-symbol">✉</span><span><small>UNIVERSITY EMAIL</small><strong>${esc(data.universityEmail)}</strong></span><b>↗</b></a><a class="contact-card" href="tel:${esc(data.phone.replace(/\s/g, ""))}"><span class="contact-symbol">⌕</span><span><small>PHONE</small><strong>${esc(data.phone)}</strong></span><b>↗</b></a><div class="location-card"><span class="contact-symbol">⌖</span><span><small>BASED IN</small><strong>${esc(data.location)}</strong></span></div><div class="contact-socials"><p class="eyebrow">AROUND THE WEB</p><div class="social-row">${socials()}</div></div></div></section>`
  };

  render.academics = render.education;
  const menuDescriptions = ["The story behind the code", "Schools, university & results", "Tools I’m building with", "Experiments & projects", "Courses & credentials", "Where I’m headed", "Showing up for community", "Moments from the journey", "Let’s start a conversation"];
  const outlet = document.querySelector("#main-content");
  outlet.innerHTML = render[page] ? render[page]() : render.home();
  document.querySelector("[data-year]").textContent = new Date().getFullYear();

  const themeButton = document.querySelector(".theme-toggle");
  const savedTheme = localStorage.getItem("portfolio-theme");
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  themeButton.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("portfolio-theme", next);
  });
  const menuButton = document.querySelector(".menu-toggle");
  menuButton.addEventListener("click", () => {
    const opened = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!opened));
    menuButton.setAttribute("aria-label", opened ? "Open navigation" : "Close navigation");
    document.querySelector(".nav-links").classList.toggle("nav-open", !opened);
  });
  document.querySelectorAll(".nav-links a").forEach(anchor => anchor.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    document.querySelector(".nav-links").classList.remove("nav-open");
  }));
  const progress = document.querySelector(".scroll-progress span");
  const topButton = document.querySelector(".back-top");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    document.querySelector(".navbar").classList.toggle("navbar-scrolled", window.scrollY > 24);
    topButton.classList.toggle("is-visible", window.scrollY > 500);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  topButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      if (entry.target.classList.contains("stats-strip")) {
        entry.target.querySelectorAll(".count-up").forEach(counter => {
          const target = Number(counter.dataset.count);
          const start = performance.now();
          const animate = now => {
            const progress = Math.min((now - start) / 700, 1);
            counter.textContent = String(Math.round(target * progress)).padStart(2, "0");
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        });
      }
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.12 });
  document.querySelectorAll(".reveal, .stats-strip").forEach(item => observer.observe(item));

  document.querySelectorAll(".filter-row").forEach(row => row.addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    row.querySelectorAll(".filter-button").forEach(item => item.classList.toggle("active", item === button));
    const group = row.nextElementSibling;
    group.querySelectorAll("[data-category]").forEach(item => {
      item.hidden = button.dataset.filter !== "all" && item.dataset.category !== button.dataset.filter;
    });
  }));
  const semesterFilter = document.querySelector("#semester-filter");
  if (semesterFilter) semesterFilter.addEventListener("change", () => document.querySelectorAll("tbody tr").forEach(row => {
    row.hidden = semesterFilter.value !== "all" && row.dataset.semester !== semesterFilter.value;
  }));

  const projectModal = document.querySelector("#project-modal");
  if (projectModal) {
    document.querySelectorAll("[data-project]").forEach(button => button.addEventListener("click", () => {
      const item = data.projects[Number(button.dataset.project)];
      document.querySelector("#project-modal-content").innerHTML = `<img class="modal-project-image" src="${esc(item.image)}" alt="Project placeholder for ${esc(item.title)}"><p class="eyebrow">${esc(item.category)} / ${item.isInternship ? "INTERNSHIP PROJECT" : "PROJECT"}</p>${item.status ? `<span class="tag">${esc(item.status)}</span>` : ""}<h2>${esc(item.title)}</h2><p>${esc(item.description)}</p>${item.note ? `<p class="project-note">${esc(item.note)}</p>` : ""}<div class="tag-row">${tags(item.stack)}</div><h3>Features</h3><ul>${item.features.map(feature => `<li>${esc(feature)}</li>`).join("")}</ul><h3>Challenge</h3><p>${esc(item.challenge)}</p><h3>What I learned</h3><p>${esc(item.learning)}</p><div class="button-row">${link(item.github, "GitHub ↗", "button button-outline")}${link(item.live, "Live demo ↗", "button button-primary")}</div>`;
      projectModal.showModal();
    }));
  }
  const certModal = document.querySelector("#certificate-modal");
  if (certModal) document.querySelectorAll("[data-certificate]").forEach(button => button.addEventListener("click", () => {
    const item = data.certificates[Number(button.dataset.certificate)];
    const image = document.querySelector("#certificate-preview");
    image.src = item.image; image.alt = `Certificate preview: ${item.title}`;
    const download = document.querySelector("#certificate-download");
    download.href = item.image; download.download = item.image.split("/").pop();
    certModal.showModal();
  }));
  const galleryModal = document.querySelector("#gallery-modal");
  if (galleryModal) {
    let galleryIndex = 0;
    const visibleGallery = () => data.gallery.filter(item => {
      const matchingButton = [...document.querySelectorAll("[data-gallery]")].find(button => Number(button.dataset.gallery) === data.gallery.indexOf(item));
      return matchingButton && !matchingButton.hidden;
    });
    const showGallery = offset => {
      const items = visibleGallery();
      if (!items.length) return;
      galleryIndex = (galleryIndex + offset + items.length) % items.length;
      const item = items[galleryIndex];
      const image = document.querySelector("#gallery-preview");
      image.src = item.image; image.alt = item.alt;
      document.querySelector("#gallery-caption").textContent = item.title;
    };
    document.querySelectorAll("[data-gallery]").forEach(button => button.addEventListener("click", () => {
      const allVisible = visibleGallery();
      galleryIndex = allVisible.findIndex(item => data.gallery.indexOf(item) === Number(button.dataset.gallery));
      showGallery(0); galleryModal.showModal();
    }));
    document.querySelector(".gallery-prev").addEventListener("click", () => showGallery(-1));
    document.querySelector(".gallery-next").addEventListener("click", () => showGallery(1));
  }
  document.querySelectorAll(".detail-modal").forEach(dialog => {
    dialog.querySelector(".modal-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  });
  const form = document.querySelector("#contact-form");
  if (form) form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const composeUrl = new URL("https://mail.google.com/mail/");
    composeUrl.search = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: data.email,
      su: values.get("subject") || "Hello from your portfolio",
      body: `Name: ${values.get("name")}\nEmail: ${values.get("email")}\n\n${values.get("message")}`
    });
    document.querySelector(".form-status").textContent = "Opening Gmail...";
    window.location.href = composeUrl.href;
  });
  document.addEventListener("keydown", event => {
    if (!galleryModal?.open) return;
    if (event.key === "ArrowLeft") document.querySelector(".gallery-prev").click();
    if (event.key === "ArrowRight") document.querySelector(".gallery-next").click();
  });
})();
