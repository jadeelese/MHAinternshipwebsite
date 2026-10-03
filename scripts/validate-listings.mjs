#!/usr/bin/env node
// validate-listings.mjs
// Gates for listings.json. Run on every PR and on build.
// R1 — program type: internship | fellowship, no permanent roles
// R2 — CA onsite/hybrid rule
// R3 — remote may be anywhere
// R4 — link check (optional, controlled by env flag — skipped by default on local)
// R5 — schema shape
// R6 — tier is 1 or 2
// R7 — no duplicate IDs
// R8 — pathway hygiene

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

const REQUIRED_FIELDS = [
  "id", "title", "organization", "category",
  "program_type", "pathway", "duration_months",
  "locations", "format",
  "partnership", "tier",
  "source_url", "link_status", "link_last_checked", "last_verified",
];

function fail(id, rule, msg) {
  return { id, rule, msg };
}

function validateListing(l, i) {
  const errors = [];
  const label = l.id || `[index ${i}]`;

  // R5 — required fields
  for (const field of REQUIRED_FIELDS) {
    if (l[field] === undefined || l[field] === null) {
      errors.push(fail(label, "R5", `missing required field: ${field}`));
    }
  }
  if (errors.length) return errors;

  // R1 — program type
  if (!ALLOWED_PROGRAM_TYPE.has(l.program_type)) {
    errors.push(fail(label, "R1", `program_type must be internship | fellowship (got "${l.program_type}")`));
  }
  if (typeof l.duration_months !== "number" || l.duration_months <= 0) {
    errors.push(fail(label, "R1", `duration_months must be a positive number`));
  }
  if (!PROGRAM_KEYWORDS.test(l.title)) {
    errors.push(fail(label, "R1", `title must indicate a program (contain one of: internship, fellowship, program, scholars, intern, rotation, co-op, summer) — got "${l.title}"`));
  }

  // R8 — pathway hygiene
  if (!ALLOWED_PATHWAY.has(l.pathway)) {
    errors.push(fail(label, "R8", `pathway must be undergrad | advanced_degree | single`));
  }

  // Format
  if (!ALLOWED_FORMAT.has(l.format)) {
    errors.push(fail(label, "R5", `format must be onsite | hybrid | remote`));
  }

  // Partnership
  if (!ALLOWED_PARTNERSHIP.has(l.partnership)) {
    errors.push(fail(label, "R5", `partnership must be specific | unknown | none`));
  }

  // Tier
  if (!ALLOWED_TIERS.has(l.tier)) {
    errors.push(fail(label, "R6", `tier must be 1 or 2 (got ${l.tier})`));
  }

  // Link status
  if (!ALLOWED_LINK_STATUS.has(l.link_status)) {
    errors.push(fail(label, "R5", `link_status must be ok | pending | broken`));
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

  // Source URL shape
  if (typeof l.source_url !== "string" || !/^https?:\/\//.test(l.source_url)) {
    errors.push(fail(label, "R5", `source_url must be an http(s) URL`));
  }

  return errors;
}

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
    return fail(listingId, "R4", `source_url returned HTTP ${res.status}`);
  } catch (e) {
    return fail(listingId, "R4", `source_url fetch failed: ${e.message}`);
  }
}

async function main() {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const listings = data.listings || [];

  let allErrors = [];

  // R7 — no duplicate IDs
  const idCounts = new Map();
  listings.forEach((l) => {
    if (!l.id) return;
    idCounts.set(l.id, (idCounts.get(l.id) || 0) + 1);
  });
  for (const [id, count] of idCounts) {
    if (count > 1) allErrors.push(fail(id, "R7", `duplicate id (${count} occurrences)`));
  }

  // R1, R2, R3, R5, R6, R8
  listings.forEach((l, i) => {
    allErrors = allErrors.concat(validateListing(l, i));
  });

  // R4 — link check (opt-in)
  if (CHECK_LINKS) {
    console.log(`Running link check on ${listings.length} URLs...`);
    const results = await Promise.all(
      listings.map((l) => checkLink(l.source_url, l.id))
    );
    results.forEach((r) => { if (r) allErrors.push(r); });
  }

  // Report
  if (allErrors.length === 0) {
    console.log(`✅ ${listings.length} listings — all gates pass.`);
    console.log(`   Buckets: ${bucketCounts(listings)}`);
    process.exit(0);
  } else {
    console.error(`❌ ${allErrors.length} validation error(s) in ${file}:`);
    allErrors.forEach((e) => {
      console.error(`  [${e.rule}] ${e.id}: ${e.msg}`);
    });
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
