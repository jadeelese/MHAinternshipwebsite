/* MHAinternshipwebsite — v2.2
   Vanilla JS. Hash routing. localStorage tracker.
   Data-driven filter options for Category + City.
*/

const STORAGE_KEY = "mhaint.v2";
const DEFAULT_STATE = { statuses: {}, reqs: {}, custom: {} };
const JUST_ADDED_DAYS = 14;

const CATEGORY_LABELS = {
  consulting: "Consulting",
  operations_admin: "Operations & admin",
  pharma_biotech: "Pharma & biotech",
  payers_insurance: "Payers & insurance",
  healthcare_tech: "Healthcare tech",
  product_analytics: "Product & analytics",
  policy_public_health: "Policy & public health",
  postgrad_fellowship: "Post-grad fellowship",
};

const PATHWAY_LABELS = {
  undergrad: "Undergrad pathway",
  advanced_degree: "Advanced-degree pathway",
};

let LISTINGS = [];
let STATE = loadState();
let FILTERS = {
  category: "all",
  window: "all",
  format: "all",
  status: "all",
  city: "all",
  paid: "all",
};

document.addEventListener("DOMContentLoaded", async () => {
  wireFilters();
  wireModal();
  wireIO();
  window.addEventListener("hashchange", route);

  try {
    const res = await fetch("listings.json", { cache: "no-store" });
    const data = await res.json();
    LISTINGS = data.listings || [];
  } catch (e) {
    console.error("Failed to load listings.json", e);
    document.getElementById("list").innerHTML =
      '<li class="empty">Could not load listings.json.</li>';
    return;
  }

  populateDynamicFilters();
  render();
  route();
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const v1 = localStorage.getItem("mhaint.v1");
      if (v1) return JSON.parse(v1);
      return structuredClone(DEFAULT_STATE);
    }
    const s = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...s };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); }
  catch (e) { console.warn("localStorage unavailable", e); }
}

function statusFor(id) { return STATE.statuses[id] || null; }
function setStatus(id, s) {
  if (!s || s === "none") delete STATE.statuses[id];
  else STATE.statuses[id] = s;
  saveState();
  render();
}

function reqsFor(id, listing) {
  const total = (listing?.other_requirements?.length || 0) + (STATE.custom[id]?.length || 0);
  const ticks = STATE.reqs[id] || {};
  let done = 0;
  Object.keys(ticks).forEach((k) => { if (ticks[k]) done += 1; });
  return { done, total };
}
function toggleReq(id, key) {
  STATE.reqs[id] = STATE.reqs[id] || {};
  STATE.reqs[id][key] = !STATE.reqs[id][key];
  saveState();
  render();
}
function addCustomReq(id, text) {
  STATE.custom[id] = STATE.custom[id] || [];
  STATE.custom[id].push(text);
  saveState();
  render();
}

// ---------- Routing ----------
function currentView() {
  const hash = location.hash || "#browse";
  if (hash.startsWith("#dashboard")) return "dashboard";
  if (hash.startsWith("#about")) return "about";
  return "browse";
}

function route() {
  const hash = location.hash || "#browse";
  const views = ["browse", "dashboard", "about"];
  let view = "browse";
  let openId = null;

  if (hash.startsWith("#l/")) { openId = decodeURIComponent(hash.slice(3)); }
  else if (hash.startsWith("#")) {
    const name = hash.slice(1);
    if (views.includes(name)) view = name;
  }

  views.forEach((v) => {
    document.getElementById("view-" + v).hidden = v !== view;
  });
  document.querySelectorAll(".nav a").forEach((a) => {
    a.removeAttribute("aria-current");
    if (a.dataset.nav === view) a.setAttribute("aria-current", "page");
  });

  if (openId) openModal(openId);
  else closeModal();

  renderHeadline(); // re-render headline on view change (hides on about + empty-dashboard)
}

// ---------- Dynamic filter population ----------
function populateDynamicFilters() {
  const presentCats = new Set(LISTINGS.map((l) => l.category).filter(Boolean));
  const catSel = document.getElementById("f-category");

  // "In-program" and "All" are already in the HTML. Add Post-grad next (if present), then the rest.
  if (presentCats.has("postgrad_fellowship")) {
    const opt = document.createElement("option");
    opt.value = "postgrad_fellowship";
    opt.textContent = CATEGORY_LABELS.postgrad_fellowship;
    catSel.appendChild(opt);
  }
  Object.keys(CATEGORY_LABELS).forEach((k) => {
    if (k === "postgrad_fellowship") return;
    if (presentCats.has(k)) {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = CATEGORY_LABELS[k];
      catSel.appendChild(opt);
    }
  });

  const cityCounts = new Map();
  LISTINGS.forEach((l) => {
    (l.locations || []).forEach((loc) => {
      const city = loc.city || "Unknown";
      cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
    });
  });
  const citySel = document.getElementById("f-city");
  const sortedCities = [...cityCounts.keys()].sort((a, b) => a.localeCompare(b));
  sortedCities.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c + ` (${cityCounts.get(c)})`;
    citySel.appendChild(opt);
  });
}

function wireFilters() {
  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      FILTERS[key] = el.value;
      render();
    });
  };
  bind("f-category", "category");
  bind("f-window", "window");
  bind("f-format", "format");
  bind("f-status", "status");
  bind("f-city", "city");
  bind("f-paid", "paid");

  const moreBtn = document.getElementById("more-filters-btn");
  const morePanel = document.getElementById("more-filters");
  if (moreBtn && morePanel) {
    moreBtn.addEventListener("click", () => {
      const open = !morePanel.hidden;
      morePanel.hidden = open;
      moreBtn.setAttribute("aria-expanded", String(!open));
      moreBtn.textContent = open ? "More filters" : "Fewer filters";
    });
  }
}

function filteredListings() {
  const now = new Date();
  return LISTINGS
    .filter((l) => {
      // Category — "in_program" is a sentinel meaning "hide post-grad"
      if (FILTERS.category === "in_program") {
        if (l.category === "postgrad_fellowship") return false;
      } else if (FILTERS.category !== "all" && l.category !== FILTERS.category) {
        return false;
      }
      if (FILTERS.format !== "all" && l.format !== FILTERS.format) return false;
      if (FILTERS.paid !== "all" && l.paid !== FILTERS.paid) return false;

      if (FILTERS.city !== "all") {
        const cities = (l.locations || []).map((x) => x.city);
        if (!cities.includes(FILTERS.city)) return false;
      }

      const d = daysUntil(l.application_deadline, now);
      const isClosed = d !== null && d < 0;
      const isRolling = !!l.rolling;
      const isOpen = !isClosed;

      switch (FILTERS.window) {
        case "all": break;
        case "open":   if (!isOpen) return false; break;
        case "rolling":if (!isRolling) return false; break;
        case "closed": if (!isClosed) return false; break;
        case "30":     if (d === null || d < 0 || d > 30) return false; break;
        case "60":     if (d === null || d < 0 || d > 60) return false; break;
        case "90":     if (d === null || d < 0 || d > 90) return false; break;
      }
      return true;
    })
    .sort(sortByDeadline);
}

function sortByDeadline(a, b) {
  const now = new Date();
  const da = a.application_deadline;
  const db = b.application_deadline;
  const aClosed = da && daysUntil(da, now) < 0;
  const bClosed = db && daysUntil(db, now) < 0;

  if (aClosed && !bClosed) return 1;
  if (!aClosed && bClosed) return -1;

  if (da && db) return da.localeCompare(db);
  if (da && !db) return -1;
  if (!da && db) return 1;
  return 0;
}

function isJustAdded(listing) {
  if (!listing.added_at) return false;
  const d = daysUntil(listing.added_at);
  return d !== null && d >= -JUST_ADDED_DAYS && d <= 0;
}

// ---------- Rendering ----------
function render() {
  renderHeadline();
  renderList();
  renderDashboard();
  renderNavBadge();
}

function renderHeadline() {
  const view = currentView();
  const headlineEl = document.getElementById("headline");

  // Headline never shows on About.
  if (view === "about") { headlineEl.hidden = true; return; }

  const now = new Date();
  // On Dashboard the headline uses only Considering + Application in progress.
  // On Browse the pool is tracked (any non-archive) if any, else all.
  const dashboardPool = LISTINGS.filter((l) => {
    const s = statusFor(l.id);
    return s === "considering" || s === "in_progress";
  });
  const trackedAny = LISTINGS.filter((l) => {
    const s = statusFor(l.id);
    return s && s !== "archive";
  });

  if (view === "dashboard" && dashboardPool.length === 0) {
    headlineEl.hidden = true;
    return;
  }
  headlineEl.hidden = false;

  const pool = view === "dashboard"
    ? dashboardPool
    : (trackedAny.length ? trackedAny : LISTINGS);

  const upcoming = pool
    .map((l) => ({ l, d: daysUntil(l.application_deadline, now) }))
    .filter((x) => x.d !== null && x.d >= 0)
    .sort((a, b) => a.d - b.d);

  const el = document.getElementById("next-deadline");
  const sub = document.getElementById("next-deadline-sub");

  if (!upcoming.length) {
    if (view === "dashboard") {
      el.innerHTML = "No upcoming deadlines <em>on tracked programs</em>.";
      sub.textContent = "Mark more programs as Considering or Application in progress to see them here.";
    } else {
      el.innerHTML = "No upcoming dated deadlines <em>in range</em>.";
      sub.textContent = "Check the full list — some programs are rolling or undated.";
    }
    return;
  }

  const { l, d } = upcoming[0];
  const days = d === 0 ? "today" : d === 1 ? "in <em>1 day</em>" : `in <em>${d} days</em>`;
  // Employer name picks up the accent green (same emphasis as "N days").
  el.innerHTML = `${escapeHtml(l.title)} <span style="color:var(--accent-strong);font-size:0.85em;">·&nbsp;${escapeHtml(l.organization)}</span> — ${days}`;
  sub.textContent = `Upcoming deadline — ${dateFmt(l.application_deadline)}.`;
}

function renderList() {
  const list = document.getElementById("list");
  const template = document.getElementById("row-template");
  list.innerHTML = "";
  const items = filteredListings();
  document.getElementById("count-num").textContent = `(${items.length})`;
  document.getElementById("empty").hidden = items.length > 0;

  items.forEach((l) => {
    const node = template.content.firstElementChild.cloneNode(true);
    fillRow(node, l);
    node.addEventListener("click", () => { location.hash = "#l/" + encodeURIComponent(l.id); });
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        location.hash = "#l/" + encodeURIComponent(l.id);
      }
    });
    list.appendChild(node);
  });
}

function fillRow(node, l) {
  node.dataset.id = l.id;
  node.querySelector(".title").textContent = l.title;
  node.querySelector(".org").textContent = "· " + l.organization;

  node.querySelector(".cat").textContent = CATEGORY_LABELS[l.category] || l.category || "—";
  node.querySelector(".loc").textContent = (l.locations || []).map((x) => x.city).join(" / ") || "—";
  node.querySelector(".mode").textContent = l.format || "—";

  // Just-added chip (first-position; shows for 14 days after added_at)
  if (isJustAdded(l)) {
    node.querySelector(".just-added").hidden = false;
  }

  // Partnership chip + nudge
  const partnership = node.querySelector(".partnership");
  const partnershipNudge = node.querySelector(".partnership-nudge");
  if (l.partnership === "specific") {
    partnership.textContent = "Partnership specific";
    partnership.classList.add("partnership-specific");
    partnership.hidden = false;
    partnershipNudge.textContent = "Verify your school is on their recruiting list — contact your MHA program's career center.";
    partnershipNudge.hidden = false;
  } else if (l.partnership === "unknown") {
    partnership.textContent = "Partnership unknown";
    partnership.classList.add("partnership-unknown");
    partnership.hidden = false;
  }

  // Pathway chip + nudge (consulting dual-listings)
  const pathwayChip = node.querySelector(".pathway-chip");
  const pathwayNudge = node.querySelector(".pathway-nudge");
  if (l.pathway === "undergrad" || l.pathway === "advanced_degree") {
    pathwayChip.textContent = PATHWAY_LABELS[l.pathway];
    pathwayChip.classList.add("pathway");
    pathwayChip.hidden = false;
    pathwayNudge.textContent = "Requirement: confirm MHA eligibility with your campus career center and/or a firm recruiter before applying — the firm decides.";
    pathwayNudge.hidden = false;
  }

  // Link-pending chip
  if (l.link_status === "pending" || l.link_status === "broken") {
    node.querySelector(".link-pending").hidden = false;
  }

  // Deadline block
  const now = new Date();
  const d = daysUntil(l.application_deadline, now);
  const days = node.querySelector(".days");
  const date = node.querySelector(".deadline-date");
  const closedChip = node.querySelector(".closed-chip");

  if (d !== null && d < 0) {
    days.textContent = "closed";
    days.classList.add("closed");
    const next = l.next_projected_month;
    date.textContent = next ? `Next window: ${next}` : "next window TBD";
    closedChip.hidden = false;
  } else if (l.rolling) {
    days.textContent = "rolling";
    days.classList.add("rolling");
    date.textContent = "ongoing";
  } else if (d === null) {
    days.textContent = "open";
    days.classList.add("rolling");
    date.textContent = "undated";
  } else if (d === 0) {
    days.textContent = "today";
    days.classList.add("urgent");
    date.textContent = dateFmt(l.application_deadline);
  } else {
    days.textContent = `in ${d} day${d === 1 ? "" : "s"}`;
    if (d <= 14) days.classList.add("urgent");
    date.textContent = dateFmt(l.application_deadline);
  }

  // Stroke progress
  const { done, total } = reqsFor(l.id, l);
  const status = statusFor(l.id);
  const fill = node.querySelector(".stroke-fill");
  const cap = node.querySelector(".stroke-cap");
  const frac = total > 0 ? Math.min(done / total, 1) : 0;
  const y2 = 10 + frac * 48;
  fill.setAttribute("y2", y2);
  const submitted = status && ["applied","interviewing"].includes(status);
  cap.setAttribute("r", submitted ? 3.5 : 0);
  if (status === "archive") node.style.opacity = "0.55";
}

function renderDashboard() {
  const groups = [
    ["considering", "Considering"],
    ["in_progress", "Application in progress"],
    ["applied", "Applied"],
    ["interviewing", "Interviewing"],
    ["archive", "Archive"],
  ];
  const host = document.getElementById("dash-groups");
  host.innerHTML = "";
  const template = document.getElementById("row-template");
  const statusFilter = FILTERS.status;

  groups.forEach(([key, label]) => {
    if (statusFilter !== "all" && statusFilter !== key) return;
    const items = LISTINGS
      .filter((l) => statusFor(l.id) === key)
      .sort(sortByDeadline);
    const section = document.createElement("section");
    section.className = "dash-group";
    const h = document.createElement("h3");
    h.textContent = `${label} · ${items.length}`;
    section.appendChild(h);
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "dash-empty";
      p.textContent = key === "considering"
        ? "Open a listing on Browse and pick a status to track it."
        : "Nothing here yet.";
      section.appendChild(p);
    } else {
      const list = document.createElement("ol");
      list.className = "list";
      items.forEach((l) => {
        const node = template.content.firstElementChild.cloneNode(true);
        fillRow(node, l);
        node.addEventListener("click", () => { location.hash = "#l/" + encodeURIComponent(l.id); });
        list.appendChild(node);
      });
      section.appendChild(list);
    }
    host.appendChild(section);
  });
}

function renderNavBadge() {
  const count = LISTINGS.filter((l) => {
    const s = statusFor(l.id);
    return s && s !== "archive";
  }).length;
  const badge = document.getElementById("nav-badge");
  if (count > 0) {
    badge.textContent = count;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

// ---------- Modal ----------
function wireModal() {
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function openModal(id) {
  const listing = LISTINGS.find((l) => l.id === id);
  if (!listing) return;
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");
  body.innerHTML = detailHtml(listing);
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal-panel").focus();
  wireModalBody(body, listing);
}

function wireModalBody(body, listing) {
  body.querySelectorAll('input[name="status"]').forEach((r) => {
    r.addEventListener("change", () => {
      setStatus(listing.id, r.value);
      body.innerHTML = detailHtml(listing);
      wireModalBody(body, listing);
    });
  });
  body.querySelectorAll('input[data-req]').forEach((c) => {
    c.addEventListener("change", () => {
      toggleReq(listing.id, c.dataset.req);
      body.innerHTML = detailHtml(listing);
      wireModalBody(body, listing);
    });
  });
  const addBtn = body.querySelector("#add-req-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const input = body.querySelector("#add-req-input");
      const val = input.value.trim();
      if (!val) return;
      addCustomReq(listing.id, val);
      body.innerHTML = detailHtml(listing);
      wireModalBody(body, listing);
    });
  }
  const shareBtn = body.querySelector("#share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = location.origin + location.pathname + "#l/" + encodeURIComponent(listing.id);
      try {
        await navigator.clipboard.writeText(url);
        const msg = body.querySelector(".share-msg");
        if (msg) { msg.textContent = "Link copied."; setTimeout(() => msg.textContent = "", 2000); }
      } catch { alert(url); }
    });
  }
}

function detailHtml(l) {
  const now = new Date();
  const d = daysUntil(l.application_deadline, now);
  let dstr;
  if (d !== null && d < 0) dstr = l.next_projected_month ? `closed · next window ${l.next_projected_month}` : "closed";
  else if (l.rolling) dstr = "rolling (ongoing)";
  else if (d === null) dstr = "open · undated";
  else if (d === 0) dstr = "today";
  else dstr = `in ${d} day${d === 1 ? "" : "s"}`;

  const st = statusFor(l.id) || "none";
  const statuses = [
    ["none", "Untracked"],
    ["considering", "Considering"],
    ["in_progress", "Application in progress"],
    ["applied", "Applied"],
    ["interviewing", "Interviewing"],
    ["archive", "Archive"],
  ];

  const reqs = (l.other_requirements || []).slice();
  const customs = STATE.custom[l.id] || [];
  const ticks = STATE.reqs[l.id] || {};
  const allReqs = [
    ...reqs.map((r, i) => ({ key: "r" + i, text: r })),
    ...customs.map((r, i) => ({ key: "c" + i, text: r })),
  ];

  const partnershipChip = l.partnership === "specific"
    ? '<span class="chip partnership-specific">Partnership specific</span>'
    : l.partnership === "unknown"
      ? '<span class="chip partnership-unknown">Partnership unknown</span>'
      : "";
  const partnershipNudge = l.partnership === "specific"
    ? '<p class="partnership-nudge">Verify your school is on their recruiting list — contact your MHA program\'s career center.</p>'
    : "";

  const pathwayChip = (l.pathway === "undergrad" || l.pathway === "advanced_degree")
    ? `<span class="chip pathway">${PATHWAY_LABELS[l.pathway]}</span>`
    : "";
  const pathwayNudge = (l.pathway === "undergrad" || l.pathway === "advanced_degree")
    ? `<p class="pathway-nudge">Requirement: confirm MHA eligibility with your campus career center and/or a firm recruiter before applying — the firm decides.</p>`
    : "";

  const justAddedChip = isJustAdded(l) ? '<span class="chip just-added">Just added</span>' : "";
  const linkPendingChip = (l.link_status === "pending" || l.link_status === "broken")
    ? '<span class="chip link-pending">Link pending</span>' : "";

  // Button label depends on url_kind: generic = Company website, program = Program page.
  // Pending link overrides both with a disabled badge.
  let postingButton;
  if (l.link_status === "pending" || l.link_status === "broken") {
    postingButton = `<span class="button pending">Link pending — re-verifying</span>
       <span class="pending-note">Last checked ${dateFmt(l.link_last_checked || l.last_verified)} · we're re-checking the source.</span>`;
  } else {
    const label = l.url_kind === "program" ? "Program page ↗" : "Company website ↗";
    postingButton = `<a class="button" href="${escapeAttr(l.source_url)}" target="_blank" rel="noopener">${label}</a>`;
  }

  return `
    <h2 class="detail-title">${escapeHtml(l.title)}</h2>
    <p class="detail-org">${escapeHtml(l.organization)}${l.program_partner ? " · " + escapeHtml(l.program_partner) : ""}</p>

    <div class="detail-meta">
      ${justAddedChip}
      <span class="chip">${escapeHtml(CATEGORY_LABELS[l.category] || l.category || "")}</span>
      <span class="chip">${(l.locations||[]).map((x)=>escapeHtml(x.city)).join(" / ")}</span>
      <span class="chip">${escapeHtml(l.format || "")}</span>
      <span class="chip">${escapeHtml(l.duration || "")}</span>
      ${partnershipChip}
      ${pathwayChip}
      ${linkPendingChip}
    </div>
    ${partnershipNudge}
    ${pathwayNudge}

    <div class="detail-block">
      <dt>Deadline</dt>
      <dd><strong>${dstr}</strong>${l.application_deadline ? " · " + dateFmt(l.application_deadline) : ""}${l.deadline_note ? " · " + escapeHtml(l.deadline_note) : ""}</dd>

      ${l.timing_guidance ? `<dt>Timing</dt><dd>${escapeHtml(l.timing_guidance)}</dd>` : ""}

      <dt>Pay</dt>
      <dd>${escapeHtml(l.paid || "unknown")}${l.compensation_note ? " · " + escapeHtml(l.compensation_note) : ""}</dd>

      ${l.notes ? `<dt>Notes</dt><dd>${escapeHtml(l.notes)}</dd>` : ""}

      <dt>Last verified</dt>
      <dd>${dateFmt(l.last_verified)}</dd>
    </div>

    <div class="detail-block">
      <dt>My status</dt>
      <div class="status-picker" role="radiogroup" aria-label="My status">
        ${statuses.map(([v, label]) => `
          <input type="radio" id="st-${v}" name="status" value="${v}" ${st === v ? "checked" : ""}/>
          <label for="st-${v}">${label}</label>
        `).join("")}
      </div>
    </div>

    <div class="detail-block">
      <dt>Requirements</dt>
      <ul class="reqs">
        ${allReqs.map((r) => `
          <li>
            <input type="checkbox" id="req-${r.key}" data-req="${r.key}" ${ticks[r.key] ? "checked" : ""}/>
            <label for="req-${r.key}" class="req-label">${escapeHtml(r.text)}</label>
          </li>
        `).join("")}
      </ul>
      <div class="share-row">
        <input type="text" id="add-req-input" placeholder="Add a requirement…" style="flex:1;padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);font:inherit;font-size:13px;" />
        <button id="add-req-btn" class="ghost" type="button">Add</button>
      </div>
    </div>

    <div class="detail-actions">
      ${postingButton}
      <button id="share-btn" class="ghost" type="button">Copy share link</button>
      <span class="share-msg"></span>
    </div>
  `;
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = "";
  if (location.hash.startsWith("#l/")) {
    history.replaceState(null, "", location.pathname + "#browse");
    route();
  }
}

function wireIO() {
  const exp = document.getElementById("btn-export");
  if (exp) exp.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mhaint-tracking.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });
  const imp = document.getElementById("file-import");
  if (imp) imp.addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      STATE = { ...structuredClone(DEFAULT_STATE), ...parsed };
      saveState(); render();
      alert("Import complete.");
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  });
  const clr = document.getElementById("btn-clear");
  if (clr) clr.addEventListener("click", () => {
    if (!confirm("Clear all tracking? This wipes statuses, checked requirements, and custom items in this browser.")) return;
    STATE = structuredClone(DEFAULT_STATE);
    saveState(); render();
  });
}

function daysUntil(iso, now = new Date()) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const ms = d - now;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
function dateFmt(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
