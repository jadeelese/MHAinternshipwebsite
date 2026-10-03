#!/usr/bin/env node
// validate-listings.mjs — v2.2
// Gates for listings.json. Run on every PR and on build.
// R1  program type: internship | fellowship, no permanent roles
// R2  CA onsite/hybrid rule
// R3  remote may be anywhere
// R4  link check (opt-in via CHECK_LINKS=1); hard failures only
// R5  schema shape
// R6  tier is 1 or 2
// R7  no duplicate IDs
// R8  pathway hygiene
// R9  url_kind (generic | program) required
// R10 added_at (ISO date) required

import { readFileSync } from "node:fs";

const file = process.argv[2] || "listings.json";
const CHECK_LINKS = process.env.CHECK_LINKS === "1";

const PROGRAM_KEYWORDS = /(internship|fellowship|program|scholars?|fellow|intern|rotation|co-?op|summer)/i;
const ALLOWED_PROGRAM_TYPE = new Set(["internship", "fellowship"]);
const ALLOWED_PATHWAY = new Set(["undergrad", "advanced_degree", "single"]);
const ALLOWED_FORMAT = new Set(["onsite", "hybrid", "remote"]);
const ALLOWED_PARTNERSHIP = new Set(["specific", "unknown", "none"]);
const ALLOWED_TIERS = new Set([1, 2]);
const ALLOWED_LINK_STATUS = new Set(["ok", "pending", "broken"]);
const ALLOWED_URL_KIND = new Set(["generic", "program"]);

const REQUIRED_FIELDS = [
  "id", "title", "organization", "category",
  "program_type", "pathway", "duration_months",
  "locations", "format",
  "partnership", "tier",
  "source_url", "url_kind",
  "link_status", "link_last_checked",
  "last_verified", "added_at",
];

function fail(id, rule, msg) { return { id, rule, msg }; }

function validateListing(l, i) {
  const errors = [];
  const label = l.id || `[index ${i}]`;
  for (const field of REQUIRED_FIELDS) {
    if (l[field] === undefined || l[field] === null) {
      errors.push(fail(label, "R5", `missing required field: ${field}`));
    }
  }
  if (errors.length) return errors;
  if (!ALLOWED_PROGRAM_TYPE.has(l.program_type)) errors.push(fail(label, "R1", `program_type must be internship | fellowship (got "${l.program_type}")`));
  if (typeof l.duration_months !== "number" || l.duration_months <= 0) errors.push(fail(label, "R1", `duration_months must be a positive number`));
  if (!PROGRAM_KEYWORDS.test(l.title)) errors.push(fail(label, "R1", `title must indicate a program — got "${l.title}"`));
  if (!ALLOWED_PATHWAY.has(l.pathway)) errors.push(fail(label, "R8", `pathway must be undergrad | advanced_degree | single`));
  if (!ALLOWED_FORMAT.has(l.format)) errors.push(fail(label, "R5", `format must be onsite | hybrid | remote`));
  if (!ALLOWED_PARTNERSHIP.has(l.partnership)) errors.push(fail(label, "R5", `partnership must be specific | unknown | none`));
  if (!ALLOWED_TIERS.has(l.tier)) errors.push(fail(label, "R6", `tier must be 1 or 2 (got ${l.tier})`));
  if (!ALLOWED_LINK_STATUS.has(l.link_status)) errors.push(fail(label, "R5", `link_status must be ok | pending | broken`));
  if (!ALLOWED_URL_KIND.has(l.url_kind)) errors.push(fail(label, "R9", `url_kind must be generic | program (got "${l.url_kind}")`));
  if (typeof l.added_at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(l.added_at)) errors.push(fail(label, "R10", `added_at must be ISO date (YYYY-MM-DD)`));
  if (!Array.isArray(l.locations) || l.locations.length === 0) {
    errors.push(fail(label, "R5", `locations must be a non-empty array`));
  } else if (l.format === "onsite" || l.format === "hybrid") {
    const hasCA = l.locations.some((loc) => loc && loc.state === "CA");
    if (!hasCA) errors.push(fail(label, "R2", `onsite/hybrid listings must have at least one CA location`));
  }
  if (typeof l.source_url !== "string" || !/^https?:\/\//.test(l.source_url)) errors.push(fail(label, "R5", `source_url must be an http(s) URL`));
  return errors;
}

async function checkLink(url, listingId) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal, headers: { "User-Agent": "MHAinternshipwebsite-link-check/1.0" } });
    clearTimeout(t);
    if (res.status >= 200 && res.status < 400) return null;
    if (res.status === 429 || res.status >= 500) return { id: listingId, rule: "R4-soft", msg: `transient HTTP ${res.status}` };
    return fail(listingId, "R4", `source_url returned HTTP ${res.status}`);
  } catch (e) {
    const msg = e.message || String(e);
    if (msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED") || msg.includes("ERR_NAME_NOT_RESOLVED")) return fail(listingId, "R4", `source_url hard failure: ${msg}`);
    return { id: listingId, rule: "R4-soft", msg: `transient fetch failure: ${msg}` };
  }
}

async function main() {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const listings = data.listings || [];
  let allErrors = [];
  const softFailures = [];
  const idCounts = new Map();
  listings.forEach((l) => { if (!l.id) return; idCounts.set(l.id, (idCounts.get(l.id) || 0) + 1); });
  for (const [id, count] of idCounts) { if (count > 1) allErrors.push(fail(id, "R7", `duplicate id (${count} occurrences)`)); }
  listings.forEach((l, i) => { allErrors = allErrors.concat(validateListing(l, i)); });
  if (CHECK_LINKS) {
    console.log(`Running link check on ${listings.length} URLs...`);
    const results = await Promise.all(listings.map((l) => checkLink(l.source_url, l.id)));
    results.forEach((r) => { if (!r) return; if (r.rule === "R4-soft") softFailures.push(r); else allErrors.push(r); });
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
  listings.forEach((l) => { buckets[l.category] = (buckets[l.category] || 0) + 1; });
  return Object.entries(buckets).map(([k, v]) => `${k}=${v}`).join(" ");
}

main().catch((e) => { console.error("Validator crashed:", e); process.exit(2); });
