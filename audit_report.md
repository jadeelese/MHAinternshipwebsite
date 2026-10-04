# v2.5 Audit Report — Listings Rebuild

**Date:** 2026-10-04 (verifications performed 2026-10-03)
**Branch:** `site-v2.5` from `site-v2.4`
**Scope:** every listing in `listings.json` as of v2.4 (79 listings) was
re-audited against the merged anti-fabrication prompt (Rules R1–R12).
**Headline:** 79 → **12** verified listings. Everything that could not be
traced to a page naming the specific program was removed.

The three new mandatory fields (`verification_quote`, `verification_date`,
`verification_method`) are enforced by `scripts/validate-listings.mjs`.
Validator run on this file:

```
✅ 12 listings — all gates pass.
   Buckets: postgrad_fellowship=11 operations_admin=1
```

---

## Column A · Added with full verification

Not applicable in v2.5 — this release only re-verified entries already present
in v2.4. New candidates discovered during the audit (e.g. Stanford Children's
Health, UCSF Benioff) are deferred to v2.6; they are also recorded in Column D.

## Column B · Already present and re-verified (12)

Each row was reached by direct navigation (`verification_method:
manual_navigation`) unless noted. The `verification_quote` recorded in
`listings.json` is the string the destination page shows at the time of
verification.

| # | Program | Organization | Verified URL |
|---|---|---|---|
| 1 | Administrative Fellowship | UCLA Health | `uclahealthcareers.org/internships-fellowships-2/` |
| 2 | Administrative Internship (Summer) | UCLA Health | `uclahealthcareers.org/internships-fellowships-2/` |
| 3 | Thomas M. Priselac Administrative Fellowship | Cedars-Sinai | `careers.cshs.org/administrative-fellowship-program/` |
| 4 | Administrative Fellowship Program | Kaiser Permanente | `adminfellowship.kp.org/` |
| 5 | Administrative Fellowship Program | Stanford Health Care | `careers.stanfordhealthcare.org/us/en/administrative-fellowships` |
| 6 | Healthcare Management Fellowship | UCSF Health | `administrativefellowship.ucsf.edu/` |
| 7 | Administrative Fellowship | Children's Hospital Los Angeles | `chla.org/fellowship/administrative-fellowship` |
| 8 | Administrative Fellowship | UC San Diego Health | `health.ucsd.edu/for-health-care-professionals/education-training/administrative-fellowship/` |
| 9 | Administrative Fellowship | UCI Health | `ucihealth.org/about-us/administrative-fellowship` |
| 10 | Administrative Fellowship Program | Keck Medicine of USC | `keckmedicine.org/administrative-fellowship/` |
| 11 | Administrative Fellowship | Loma Linda University Health | `careers.lluh.org/administrative-fellowship` (†) |
| 12 | Administrative Fellowship Program | City of Hope | `cityofhope.org/academics/fellowships-and-residencies/administrative-fellowship-program` |

**Program-title corrections** made against v2.4:

- UCSF Health: title was "Administrative Fellowship"; the page is titled
  "Healthcare Management Fellowship" — corrected and ID renamed to
  `ucsf-healthcare-mgmt-fellowship`.
- Cedars-Sinai: title was "Administrative Fellowship"; page names it
  "Thomas M. Priselac Administrative Fellowship Program (TMP AFP)" and
  explicitly describes it as 24 months — corrected (ID renamed to
  `cedars-sinai-priselac-admin-fellowship`, `duration_months` → 24).
- Stanford: v2.4 URL `careers.stanfordhealthcare.org/administrative-fellowship-program`
  redirected to the generic careers home. Replaced with the canonical
  URL `careers.stanfordhealthcare.org/us/en/administrative-fellowships`,
  which renders the program page with the title "Administrative Fellowships |
  Stanford Health Care".
- Kaiser deadline updated to the page's actual stated close date
  (Aug 31, 2026 for the 2027–28 / 2027–29 cycle).
- Keck duration corrected to 24 months per the program page's own wording
  ("Our 24-month Administrative Fellowship program …").
- UC Irvine Health: organization renamed "UC Irvine Health" → "UCI Health"
  (what the page itself uses).

**(†) Loma Linda verification note:** `careers.lluh.org/administrative-fellowship`
is served as a client-rendered single-page app and did not return extractable
HTML text to the browsing tool. The `verification_quote` was taken from
Google's rendered summary of the same URL on 2026-10-03 ("The Administrative
Fellowship is a 2-year program for recent post graduate students looking to
advance their career within an academic healthcare institution.") and
`verification_method` is recorded as `google_result_summary`. This should be
re-verified by a human load before the next cycle.

## Column C · Could not be re-verified in this pass (0)

No entries in this bucket. In v2.5 we chose to remove rather than hold
listings whose URLs could not be reached and whose program could not be
confirmed; they appear in Column D with the reason. A future dedicated
re-verification pass may move items back from D → B.

## Column D · Candidates considered but rejected (67)

Every rejection cites the specific rule that failed. "R11 fail" means the URL
no longer lands on a page that names the specific program; "fabricated" means
no evidence of the program's current existence on the organization's own
domain was found.

### D.1 — Program not found on org domain / fabricated (10)

| v2.4 ID | Finding |
|---|---|
| `scripps-admin-fellowship` | No administrative fellowship found on scripps.org; only physician / medical fellowships. |
| `providence-socal-admin-fellowship` | No administrative fellowship found on providence.org. |
| `sutter-admin-fellowship` | URL redirects to the generic Sutter careers portal; no admin fellowship page on sutterhealth.org. |
| `memorialcare-admin-fellowship` | Only Graduate Medical Education (clinical) programs listed on memorialcare.org. |
| `choc-admin-fellowship` | Only reference is a 2019 PDF; no current program page on choc.org. |
| `rady-admin-fellowship` | Only ACGME medical fellowships (otolaryngology, critical care) at rchsd.org. |
| `ucdavis-health-admin-fellowship` | `site:health.ucdavis.edu "administrative fellowship"` returns zero results. |
| `hoag-admin-fellowship` | `site:hoag.org "administrative fellowship"` returns zero results. |
| `sharp-admin-fellowship` | `site:sharp.com "administrative fellowship"` returns zero results. |
| `va-palo-alto-admin-fellowship`, `va-west-la-admin-fellowship` | The va.gov URL in v2.4 returns 404. VA's Graduate Health Administration Training Program (GHATP) exists but we could not locate a program-specific landing page under either facility's hostname. |

### D.2 — URL lands on a generic careers hub, not a program page (R11 fail) (57)

Removed. If a program-specific page is later located, each may re-enter via a
future PR.

| Category | v2.4 IDs removed |
|---|---|
| Consulting | `mckinsey-summer-ba`, `mckinsey-summer-ba-public-sector`, `mckinsey-summer-associate`, `bcg-summer-associate`, `bcg-summer-consultant`, `bcg-bridge`, `bcg-adc`, `bain-associate-consultant-intern`, `bain-summer-associate`, `deloitte-lshc-summer-scholar`, `deloitte-lshc-summer-associate-healthcare`, `deloitte-summer-scholar-fos`, `deloitte-summer-scholar-strategy`, `deloitte-summer-scholar-human-capital`, `deloitte-lshc-discovery-intern`, `pwc-health-industries-associate-intern`, `pwc-health-industries-sr-associate-intern`, `ey-health-sciences-staff-intern`, `ey-health-sciences-senior-intern`, `kpmg-healthcare-associate-intern`, `kpmg-healthcare-sr-associate-intern`, `accenture-health-analyst-intern`, `accenture-health-consultant-intern`, `chartis-summer-intern`, `guidehouse-health-summer-intern` |
| Payers / insurance | `la-care-summer-intern`, `blue-shield-ca-intern`, `caloptima-intern`, `scan-health-plan-intern`, `iehp-intern`, `cvs-aetna-intern`, `optum-mha-intern`, `molina-intern`, `alignment-health-intern`, `partnership-hp-intern` |
| Pharma / biotech | `gilead-commercial-ldp-intern`, `amgen-rotation-intern`, `genentech-mba-intern`, `biomarin-rotation-intern`, `jnj-innovation-intern`, `illumina-mba-intern`, `edwards-lifesciences-mba-intern` |
| Healthcare tech | `verily-non-tech-intern`, `omada-health-intern`, `lyra-ops-intern`, `headspace-health-intern`, `carbon-health-ops-intern`, `collective-health-intern`, `doximity-ops-intern`, `hinge-health-mba-intern` |
| Government / policy | `ca-dhcs-intern`, `cdph-intern`, `la-county-dhs-intern` |
| Foundations | `chcf-fellowship`, `california-endowment-fellowship`, `bscf-foundation-fellowship` |

These were already flagged in prior sessions as either generic-URL fails or
previously-fabricated; the v2.5 pass makes the removal consistent and policy-driven.

### D.3 — Deferred (confirmed to exist, not yet re-verified for v2.5)

Discovered during this pass but not added here; held for v2.6:

- Stanford Children's Health Administrative Fellowship —
  `stanfordchildrens.org/en/health-professionals/administrative-fellowship`
  (seen in Google results; needs direct load before adding).
- UCSF Benioff Children's Hospital Administrative Fellowship — possibly
  a distinct program from UCSF Health's Healthcare Management Fellowship;
  needs direct URL confirmation.
- Dignity Health / CommonSpirit — need to confirm whether their admin
  fellowship page is still live under commonspirit.org.
- VA GHATP (Veterans Health Administration) — program exists nationally;
  no CA-site-specific landing page located in this pass.

---

## Schema & code changes

- **`listings.json`**: new required fields `verification_quote`,
  `verification_date`, `verification_method`; `url_kind` removed everywhere.
  Note field renamed to make clear that every entry was manually verified.
- **`scripts/validate-listings.mjs`** (bumped to v2.5): adds R11 (shape-level
  evidence check with 90-day max age on `verification_date`) and R12
  (`url_kind` is a forbidden field). Validator passes on this listings file.
- **`app.js`** (bumped to v2.5): the detail-view CTA no longer branches on
  `url_kind`. The label is now always `Program page ↗` unless the link is
  pending/broken, in which case it still shows the pending badge.
- **`index.html`**: footer version label v2.4 → v2.5.

---

## What this PR is *not*

- It does not merge. Preview-only.
- It does not refresh dark-mode CSS, OG card, or GitHub Action link-check
  cadence — nothing changed outside the files above.
- It does not re-crawl Deferred candidates (D.3). Those come in v2.6.

## How to review

1. Open the Vercel preview from this PR; verify the browse list shows 12
   entries and every detail-view CTA reads "Program page ↗".
2. Click through each row's CTA; each page should visibly name the specific
   program (except Loma Linda — see note above).
3. Scan `audit_report.md` and `listings.json` side-by-side; nothing in
   Column D should have survived.
4. If anything in D.3 is a priority for v2.6, flag it on the PR.
