#!/usr/bin/env node
// validate-listings.mjs — v2.5
// Gates for listings.json. Run on every PR and on build.
//
// R1  program type: internship | fellowship, no permanent roles
// R2  CA onsite/hybrid rule
// R3  remote may be anywhere
// R4  link check (opt-in via CHECK_LINKS=1); hard failures only
// R5  schema shape
// R6  tier is 1 or 2
// R7  no duplicate IDs
// R8  pathway hygiene
// R9  (retired) — url_kind removed in v2.5; see R12
// R10 added_at (ISO date) required
// R11 source_url must land on a page that NAMES the program.
//     Enforced lightly here (shape only — the quote-match must be
//     performed by a human or by scripts/verify-urls.mjs). We require
//     verification_quote + verification_date + verification_method and
//     verification_date within VERIFICATION_MAX_AGE_DAYS.
// R12 no url_kind branching: field is forbidden; UI label is always "Program page ↗".

import { readFileSync } from "node:fs";

const file = process.argv[2] || "listings.json";
const CHECK_LINKS = process.env.CHECK_LINKS === "1";
const VERIFICATION_MAX_AGE_DAYS = 90;

const PROGRAM_KEYWORDS = /(internship|fellowship|program|scholars?|fellow|intern|rotation|co-?op|summer)/i;
const ALLOWED_PROGRAM_TYPE = new Set(["internship", "fellowship"]);
const ALLOWED_PATHWAY = new Set(["undergrad", "advanced_degree", "single"]);
const ALLOWED_FORMAT = new Set(["onsite", "hybrid", "remote"]);
const ALLOWED_PARTNERSHIP = new Set(["specific", "unknown", "none"]);
const ALLOWED_TIERS = new Set([1, 2]);
const ALLOWED_LINK_STATUS = new Set(["ok", "pending", "broken"]);
const ALLOWED_VERIFICATION_METHOD = new Set([
  "manual_navigation",
  "google_result_summary",
  "pdf_download",
]);

const REQUIRED_FIELDS = [
  "id", "title", "organization", "category",
  "program_type", "pathway", "duration_months",
  "locations", "format",
  "partnership", "tier",
  "source_url",
  "link_status", "link_last_checked",
  "last_verified", "added_at",
  "verification_quote", "verification_method", "verification_date",
];

const FORBIDDEN_FIELDS = ["url_kind"];

function fail(id, rule, msg) {
  return { id, rule, msg };
}

function daysSince(iso, now = new Date()) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function validateListing(l, i) {
  const errors = [];
  const label = l.id || `[index ${i}]`;

  for (const field of REQUIRED_FIELDS) {
    if (l[field] === undefined || l[field] === null || l[field] === "") {
      errors.push(fail(label, "R5", `missing required field: ${field}`));
    }
  }
  if (errors.length) return errors;

  // R12 — url_kind forbidden
  for (const forbidden of FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(l, forbidden)) {
      errors.push(fail(label, "R12", `forbidden field present: ${forbidden} (removed in v2.5)`));
    }
  }

  if (!ALLOWED_PROGRAM_TYPE.has(l.program_type)) {
    errors.push(fail(label, "R1", `program_type must be internship | fellowship (got "${l.program_type}")`));
  }
  if (typeof l.duration_months !== "number" || l.duration_months <= 0) {
    errors.push(fail(label, "R1", `duration_months must be a positive number`));
  }
  if (!PROGRAM_KEYWORDS.test(l.title)) {
    errors.push(fail(label, "R1", `title must indicate a program — got "${l.title}"`));
  }

  if (!ALLOWED_PATHWAY.has(l.pathway)) {
    errors.push(fail(label, "R8", `pathway must be undergrad | advanced_degree | single`));
  }

  if (!ALLOWED_FORMAT.has(l.format)) {
    errors.push(fail(label, "R5", `format must be onsite | hybrid | remote`));
  }

  if (!ALLOWED_PARTNERSHIP.has(l.partnership)) {
    errors.push(fail(label, "R5", `partnership must be specific | unknown | none`));
  }

  if (!ALLOWED_TIERS.has(l.tier)) {
    errors.push(fail(label, "R6", `tier must be 1 or 2 (got ${l.tier})`));
  }

  if (!ALLOWED_LINK_STATUS.has(l.link_status)) {
    errors.push(fail(label, "R5", `link_status must be ok | pending | broken`));
  }

  // R10 — added_at
  if (typeof l.added_at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(l.added_at)) {
    errors.push(fail(label, "R10", `added_at must be ISO date (YYYY-MM-DD)`));
  }

  // R11 — URL-lands-on-program-page evidence
  if (typeof l.verification_quote !== "string" || l.verification_quote.length < 10) {
    errors.push(fail(label, "R11", `verification_quote must be a substantive string from the page naming the program`));
  }
  if (!ALLOWED_VERIFICATION_METHOD.has(l.verification_method)) {
    errors.push(fail(label, "R11", `verification_method must be one of: ${[...ALLOWED_VERIFICATION_METHOD].join(" | ")}`));
  }
  if (typeof l.verification_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(l.verification_date)) {
    errors.push(fail(label, "R11", `verification_date must be ISO date (YYYY-MM-DD)`));
  } else {
    const age = daysSince(l.verification_date);
    if (age !== null && age > VERIFICATION_MAX_AGE_DAYS) {
      errors.push(fail(label, "R11", `verification_date is ${age} days old (max ${VERIFICATION_MAX_AGE_DAYS}); re-verify the URL`));
    }
  }

  // R2 / R3 — geography
  if (!Array.isArray(l.locations) || l.locations.length === 0) {
    errors.push(fail(label, "R5", `locations must be a non-empty array`));
  } else if (l.format === "onsite" || l.format === "hybrid") {
    const hasCA = l.locations.some((loc) => loc && loc.state === "CA");
    if (!hasCA) {
      errors.push(fail(label, "R2", `onsite/hybrid listings must have at least one CA location`));
    }
  }

  if (typeof l.source_url !== "string" || !/^https?:\/\//.test(l.source_url)) {
    errors.push(fail(label, "R5", `source_url must be an http(s) URL`));
  }

  return errors;
}

// Hard-failure classification. Soft failures (timeout, 5xx) are NOT flipped to pending.
async function checkLink(url, listingId) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "MHAinternshipwebsite-link-check/1.0" }
    });
    clearTimeout(t);
    if (res.status >= 200 && res.status < 400) return null;
    if (res.status === 429 || res.status >= 500) {
      return { id: listingId, rule: "R4-soft", msg: `transient HTTP ${res.status}` };
    }
    return fail(listingId, "R4", `source_url returned HTTP ${res.status}`);
  } catch (e) {
    const msg = e.message || String(e);
    if (msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED") || msg.includes("ERR_NAME_NOT_RESOLVED")) {
      return fail(listingId, "R4", `source_url hard failure: ${msg}`);
    }
    return { id: listingId, rule: "R4-soft", msg: `transient fetch failure: ${msg}` };
  }
}

async function main() {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const listings = data.listings || [];

  let allErrors = [];
  const softFailures = [];

  const idCounts = new Map();
  listings.forEach((l) => {
    if (!l.id) return;
    idCounts.set(l.id, (idCounts.get(l.id) || 0) + 1);
  });
  for (const [id, count] of idCounts) {
    if (count > 1) allErrors.push(fail(id, "R7", `duplicate id (${count} occurrences)`));
  }

  listings.forEach((l, i) => {
    allErrors = allErrors.concat(validateListing(l, i));
  });

  if (CHECK_LINKS) {
    console.log(`Running link check on ${listings.length} URLs...`);
    const results = await Promise.all(
      listings.map((l) => checkLink(l.source_url, l.id))
    );
    results.forEach((r) => {
      if (!r) return;
      if (r.rule === "R4-soft") softFailures.push(r);
      else allErrors.push(r);
    });
  }

  if (softFailures.length) {
    console.log(`⚠️  ${softFailures.length} transient failure(s) (soft, no action):`);
    softFailures.forEach((e) => console.log(`  [${e.rule}] ${e.id}: ${e.msg}`));
  }

  if (allErrors.length === 0) {
    console.log(`✅ ${listings.length} listings — all gates pass.`);
    console.log(`   Buckets: ${bucketCounts(listings)}`);
    process.exit(0);
  } else {
    console.error(`❌ ${allErrors.length} validation error(s) in ${file}:`);
    allErrors.forEach((e) => console.error(`  [${e.rule}] ${e.id}: ${e.msg}`));
    process.exit(1);
  }
}

function bucketCounts(listings) {
  const buckets = {};
  listings.forEach((l) => {
    buckets[l.category] = (buckets[l.category] || 0) + 1;
  });
  return Object.entries(buckets).map(([k, v]) => `${k}=${v}`).join(" ");
}

main().catch((e) => {
  console.error("Validator crashed:", e);
  process.exit(2);
});
