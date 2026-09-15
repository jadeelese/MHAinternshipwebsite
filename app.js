/* MHAinternshipwebsite — v1
   Vanilla JS. No build. Hash routing. localStorage tracker.
*/

const STORAGE_KEY = "mhaint.v1";
const DEFAULT_STATE = { statuses: {}, reqs: {}, custom: {} };
const REQ_KEYS = (list) => list.map((_, i) => "r" + i); // requirement index → key

let LISTINGS = [];
let STATE = loadState();
let FILTERS = {
  category: "all",
  window: "all",
  status: "all",
  postgrad: false,
  mode: "all",
  paid: "all",
  year: "all",
  travel: "all",
};

// ---------- Boot ----------
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

  render();
  route();
});

// ---------- State ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
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
  if (!s) delete STATE.statuses[id];
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

  // Hide the headline on About view (it's the list-only orientation)
  document.getElementById("headline").hidden = view === "about";
}

// ---------- Filters ----------
function wireFilters() {
  const bind = (id, key, transform) => {
    const el = document.getElementById(id);
    el.addEventListener("change", () => {
      FILTERS[key] = transform ? transform(el) : el.value;
      render();
    });
  };
  bind("f-category", "category");
  bind("f-window", "window");
  bind("f-status", "status");
  bind("f-postgrad", "postgrad", (el) => el.checked);
  bind("f-mode", "mode");
  bind("f-paid", "paid");
  bind("f-year", "year");
  bind("f-travel", "travel");

  const moreBtn = document.getElementById("more-filters-btn");
  const morePanel = document.getElementById("more-filters");
  moreBtn.addEventListener("click", () => {
    const open = !morePanel.hidden;
    morePanel.hidden = open;
    moreBtn.setAttribute("aria-expanded", String(!open));
    moreBtn.textContent = open ? "More filters" : "Fewer filters";
  });
}

function filteredListings() {
  const now = new Date();
  return LISTINGS
    .filter((l) => {
      if (!FILTERS.postgrad && l.mha_year_required === "post_graduate") return false;
      if (FILTERS.category !== "all" && l.category !== FILTERS.category) return false;
      if (FILTERS.mode !== "all" && l.work_mode !== FILTERS.mode) return false;
      if (FILTERS.paid !== "all" && l.paid !== FILTERS.paid) return false;
      if (FILTERS.year !== "all" && l.mha_year_required !== FILTERS.year) return false;

      if (FILTERS.travel === "yes-or-na" &&
        !(l.conference_travel_covered === "yes" || l.conference_travel_covered === "not_applicable")) return false;
      if (FILTERS.travel === "hide-no" && l.conference_travel_covered === "no") return false;

      if (FILTERS.window !== "all") {
        const days = daysUntil(l.application_deadline, now);
        const limit = parseInt(FILTERS.window, 10);
        if (days === null || days > limit) return false;
      }

      if (FILTERS.status !== "all") {
        const st = statusFor(l.id);
        if (FILTERS.status === "untracked") { if (st) return false; }
        else if (st !== FILTERS.status) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const da = a.application_deadline || "9999-12-31";
      const db = b.application_deadline || "9999-12-31";
      return da.localeCompare(db);
    });
}

// ---------- Rendering ----------
function render() {
  renderHeadline();
  renderList();
  renderDashboard();
  renderNavBadge();
}

function renderHeadline() {
  const now = new Date();
  // Prefer tracked listings; else the earliest overall
  const tracked = LISTINGS.filter((l) => {
    const s = statusFor(l.id);
    return s && s !== "passed";
  });
  const pool = tracked.length ? tracked : LISTINGS;
  const upcoming = pool
    .map((l) => ({ l, d: daysUntil(l.application_deadline, now) }))
    .filter((x) => x.d !== null && x.d >= 0)
    .sort((a, b) => a.d - b.d);

  const el = document.getElementById("next-deadline");
  const sub = document.getElementById("next-deadline-sub");
  if (!upcoming.length) {
    el.innerHTML = "No upcoming deadlines <em>in range</em>.";
    sub.textContent = "Check the browse list or widen your filters.";
    return;
  }
  const { l, d } = upcoming[0];
  const days = d === 0 ? "today" : d === 1 ? "in <em>1 day</em>" : `in <em>${d} days</em>`;
  el.innerHTML = `${escapeHtml(l.title)} — ${days}`;
  sub.textContent = tracked.length
    ? `From your tracked programs. ${dateFmt(l.application_deadline)}.`
    : `Earliest deadline on the list. ${dateFmt(l.application_deadline)}.`;
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

  const cat = node.querySelector(".cat");
  cat.textContent = l.category === "mha_admin" ? "MHA admin" : "Health tech";
  const loc = node.querySelector(".loc");
  loc.textContent = (l.locations || []).map((x) => x.city).join(" / ") || "—";
  const mode = node.querySelector(".mode");
  mode.textContent = l.work_mode;

  const ucla = node.querySelector(".ucla");
  if (l.ucla_history === "hosted_ucla_alum") {
    ucla.textContent = "UCLA alum hosted";
    ucla.hidden = false;
  } else if (l.ucla_history === "ucla_recruited") {
    ucla.textContent = "UCLA-recruited";
    ucla.hidden = false;
  }

  const stale = node.querySelector(".stale");
  if (isStale(l)) stale.hidden = false;

  // Deadline
  const now = new Date();
  const d = daysUntil(l.application_deadline, now);
  const days = node.querySelector(".days");
  const date = node.querySelector(".deadline-date");
  if (d === null) {
    days.textContent = "TBD";
  } else if (d < 0) {
    days.textContent = "closed";
    days.classList.add("overdue");
  } else if (d === 0) {
    days.textContent = "today";
    days.classList.add("urgent");
  } else {
    days.textContent = `in ${d} day${d === 1 ? "" : "s"}`;
    if (d <= 14) days.classList.add("urgent");
  }
  date.textContent = l.application_deadline ? dateFmt(l.application_deadline) : "";

  // Stroke
  const { done, total } = reqsFor(l.id, l);
  const status = statusFor(l.id);
  const fill = node.querySelector(".stroke-fill");
  const cap = node.querySelector(".stroke-cap");
  const frac = total > 0 ? Math.min(done / total, 1) : 0;
  const y2 = 10 + frac * 48;
  fill.setAttribute("y2", y2);
  const submitted = status && ["applied","interviewing","offer"].includes(status);
  cap.setAttribute("r", submitted ? 3.5 : 0);
  if (status === "passed") {
    node.style.opacity = "0.55";
  }
}

function renderDashboard() {
  const groups = [
    ["considering", "Considering"],
    ["applied", "Applied"],
    ["interviewing", "Interviewing"],
    ["offer", "Offer"],
    ["passed", "Passed"],
  ];
  const host = document.getElementById("dash-groups");
  host.innerHTML = "";
  const template = document.getElementById("row-template");

  groups.forEach(([key, label]) => {
    const items = LISTINGS
      .filter((l) => statusFor(l.id) === key)
      .sort((a, b) => (a.application_deadline || "").localeCompare(b.application_deadline || ""));
    const section = document.createElement("section");
    section.className = "dash-group";
    const h = document.createElement("h3");
    h.textContent = `${label} · ${items.length}`;
    section.appendChild(h);
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "dash-empty";
      p.textContent = key === "considering"
        ? "Open a listing and pick a status to track it."
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
    return s && s !== "passed";
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

  // Wire status
  body.querySelectorAll('input[name="status"]').forEach((r) => {
    r.addEventListener("change", () => {
      setStatus(id, r.value === "none" ? null : r.value);
      body.innerHTML = detailHtml(listing);
      wireModalBody(body, listing);
    });
  });
  wireModalBody(body, listing);
}

function wireModalBody(body, listing) {
  body.querySelectorAll('input[name="status"]').forEach((r) => {
    r.addEventListener("change", () => {
      setStatus(listing.id, r.value === "none" ? null : r.value);
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
  const dstr = d === null ? "TBD" : d < 0 ? "closed" : d === 0 ? "today" : `in ${d} day${d === 1 ? "" : "s"}`;

  const st = statusFor(l.id) || "none";
  const statuses = [
    ["none","Untracked"],
    ["considering","Considering"],
    ["applied","Applied"],
    ["interviewing","Interviewing"],
    ["offer","Offer"],
    ["passed","Passed"],
  ];

  const reqs = (l.other_requirements || []).slice();
  const customs = STATE.custom[l.id] || [];
  const ticks = STATE.reqs[l.id] || {};
  const allReqs = [
    ...reqs.map((r, i) => ({ key: "r" + i, text: r })),
    ...customs.map((r, i) => ({ key: "c" + i, text: r })),
  ];

  const stale = isStale(l);

  return `
    <h2 class="detail-title">${escapeHtml(l.title)}</h2>
    <p class="detail-org">${escapeHtml(l.organization)}${l.program_partner ? " · " + escapeHtml(l.program_partner) : ""}</p>

    <div class="detail-meta">
      <span class="chip">${l.category === "mha_admin" ? "MHA admin" : "Health tech · non-tech"}</span>
      <span class="chip">${(l.locations||[]).map((x)=>escapeHtml(x.city)).join(" / ")}</span>
      <span class="chip">${escapeHtml(l.work_mode)}</span>
      <span class="chip">${escapeHtml(l.duration || "")}</span>
      ${l.ucla_history === "hosted_ucla_alum" ? '<span class="chip ucla">UCLA alum hosted</span>' : ""}
      ${l.ucla_history === "ucla_recruited" ? '<span class="chip ucla">UCLA-recruited</span>' : ""}
      ${stale ? '<span class="chip stale">verify — data may be stale</span>' : ""}
    </div>

    <div class="detail-block">
      <dt>Deadline</dt>
      <dd><strong>${dstr}</strong> · ${dateFmt(l.application_deadline)}${l.deadline_note ? " · " + escapeHtml(l.deadline_note) : ""}</dd>

      <dt>Program start</dt>
      <dd>${l.program_start ? dateFmt(l.program_start) : "—"}</dd>

      <dt>Pay</dt>
      <dd>${escapeHtml(l.paid || "unknown")}${l.compensation_note ? " · " + escapeHtml(l.compensation_note) : ""}</dd>

      <dt>MHA year needed</dt>
      <dd>${prettyYear(l.mha_year_required)}</dd>

      <dt>Conference travel covered</dt>
      <dd>${escapeHtml(l.conference_travel_covered || "unknown")}</dd>

      ${l.notes ? `<dt>Notes</dt><dd>${escapeHtml(l.notes)}</dd>` : ""}

      <dt>Last verified</dt>
      <dd>${dateFmt(l.last_verified)}${stale ? " — <span style=\"color:var(--warn)\">stale</span>" : ""}</dd>
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
      <a class="button" href="${escapeAttr(l.source_url)}" target="_blank" rel="noopener">Open source ↗</a>
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

// ---------- Import / Export ----------
function wireIO() {
  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mhaint-tracking.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });
  document.getElementById("file-import").addEventListener("change", async (e) => {
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
  document.getElementById("btn-clear").addEventListener("click", () => {
    if (!confirm("Clear all tracking? This wipes statuses, checked requirements, and custom items in this browser.")) return;
    STATE = structuredClone(DEFAULT_STATE);
    saveState(); render();
  });
}

// ---------- Utils ----------
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
function isStale(l) {
  if (!l.last_verified) return false;
  const limit = l.stale_after_days || 45;
  const d = daysUntil(l.last_verified);
  return d !== null && d <= -limit;
}
function prettyYear(y) {
  return ({
    mha_year_1: "MHA Year 1",
    mha_year_2: "MHA Year 2",
    either: "Either year",
    post_graduate: "Post-graduate",
    unknown: "Unknown",
  })[y] || y;
}
function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
