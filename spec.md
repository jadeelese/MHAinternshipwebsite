# Internship & Fellowship Dashboard — Spec (v0.1)

Name: **MHAinternshipwebsite**
Reference: https://fellowsource.com/ (structure, dashboard idea, deadline-centric layout)
Owner: Jade — **MHA Year 1, Q4 by term, but ~halfway through the program (went part-time earlier)**
Date: 2026-09-14

### What that timing means for the listings
Two waves matter right now:
1. **Summer internships for MHA Y1 → Y2** — apps typically open **Fall of Y1**, decisions late winter/spring. **Near-term priority.**
2. **Post-graduate administrative fellowships** (start after graduation) — most deadlines land in **Fall of Y2**. Include them so Jade can start scouting now and apply next cycle. Default filter shows both; a toggle can hide post-grad ones.

---

## 1. What it is

**The list of fellowships and internships a UCLA MHA student should actually apply to this year, tracked from deadline to offer.**

Not a global job board. Not FellowSource-for-MHA. The **UCLA-cohort inside list**.

## 2. Who it's for (v1)

- Primary: **Jade + UCLA MHA cohort.**
- Secondary: friends of the cohort at UCLA who want the same lens.
- Anyone with the link sees the listings; only *their own* tracking state is saved locally (see §7). No accounts in v1.

## 3. What counts as an eligible listing

A listing goes in the dashboard **only if all three are true**:

**(a) Topic fit — one of:**
  - Fellowship or internship aligned with an MHA (health system administration, hospital operations, provider ops, payer ops, health policy, population health, quality/value-based care, healthcare consulting, healthcare finance/strategy).
  - Fellowship or internship in **healthcare technology** — EHR, EMR, clinical decision support (CDS), health IT (HIT), healthcare AI, digital health, informatics — **and the role is non-technical** (product, program management, operations, implementation, strategy, analytics-lite, policy, UX research). No SWE / ML engineering / hard-coding roles.

**(b) Geographic fit — one of (UCLA-anchored):**
  - Doable from **UCLA / Los Angeles** (onsite in LA, or hybrid with LA office).
  - **Remote-eligible** from LA.
  - Explicitly **recruited from UCLA MHA** (even if the seat is elsewhere).
  - Elsewhere in California (SD, SF/Bay) or the US is OK *only if* remote-friendly or the employer covers relocation/travel to fit UCLA class schedule.

**(c) Travel policy for conferences:**
  - If the program requires travel to a fellowship/internship conference or summit, **travel + lodging + registration fees must be covered by the employer.** (If unstated, flag as "unknown" — don't drop.)

## 4. Data model — fields per listing

Required unless marked optional. `unknown` is a valid value everywhere (surface it in the UI, don't fake it).

| Field | Type | Notes |
|---|---|---|
| `id` | string | slug, e.g. `kaiser-mha-fellowship-2027` |
| `title` | string | as printed by the program |
| `organization` | string | employer / host |
| `program_partner` | string, optional | university or partner (e.g. "USC / Sanofi") |
| `category` | enum | `mha_admin` \| `health_tech_nontech` |
| `subcategory` | enum, optional | e.g. `hospital_ops`, `payer`, `consulting`, `ehr`, `cds`, `ai`, `informatics`, `digital_health`, `policy` |
| `locations` | list of `{city, state}` | can be multiple |
| `work_mode` | enum | `onsite` \| `hybrid` \| `remote` \| `remote_or_office_LA_SD_SF` |
| `duration` | string | e.g. "1 year", "10 weeks (summer)" |
| `paid` | enum | `paid` \| `unpaid` \| `stipend` \| `unknown` |
| `compensation_note` | string, optional | "$X/hr", "salaried, benefits", stipend amount |
| `application_open` | date, optional | |
| `application_deadline` | date | THE key sort field |
| `program_start` | date, optional | |
| `mha_year_required` | enum | `mha_year_1` \| `mha_year_2` \| `either` \| `post_graduate` \| `unknown` |
| `other_requirements` | list of strings | "LOI", "CV", "transcript", "2 LORs", "portal application", "interview" |
| `conference_travel_covered` | enum | `yes` \| `no` \| `unknown` \| `not_applicable` |
| `technical_background_required` | bool | must be `false` to appear (see §3a) |
| `source_url` | url | link to official posting |
| `ucla_history` | enum | `hosted_ucla_alum` \| `ucla_recruited` \| `unknown` \| `no_known_history` (Virgil's remix cue — shown as a small chip) |
| `notes` | string, optional | free text |
| `last_verified` | date | when this listing was last confirmed against `source_url` |
| `stale_after_days` | int | default 45; after this, card shows a "verify me" affordance |

## 5. Pages (post-panel cuts)

**Cut**: separate Events page (events fold into each listing card). No more filter proliferation.

1. **Home / list** — sort default: application deadline ascending. Above the list, one bold line: **"Your next deadline: [X] in [N] days."** Only **three** filters at top:
   - **Category** (MHA admin / health-tech non-tech)
   - **Deadline window** (next 30 / 60 / 90 days / all)
   - **My status** (all / considering / applied / interviewing / offer / passed)
   Everything else (location, paid, MHA year, conference travel) moves to a "More filters" drawer. Post-grad admin fellowships are hidden behind a single toggle: **"Show post-grad fellowships too."**

2. **Detail (in-page expansion)** — all fields, requirement stroke (see §6), source link, inline info-session dates, share button (see §8).

3. **My dashboard** — the tracker. Grouped by status: **Considering / Applied / Interviewing / Offer / Passed** (collapsed). Each row shows the filling stroke.

4. **About / how this list is built** — one paragraph on eligibility (§3) + the "verify on the source page before applying" note.

## 6. The requirement stroke (Ive's cut on the checklist)

Not checkboxes. A **single short vertical stroke** to the left of each listing that fills as the user ticks each requirement done. When all are done and the application is submitted, the top of the stroke closes into a small filled circle. One line per program. This stroke is the **only accent color** on the page — the quiet signature.

Requirements a user can tick:
- Application portal submitted
- Letter of intent
- CV / resume
- Transcript
- Letters of recommendation (n of N)
- Sponsor selection (if applicable)
- Interview scheduled / completed
- Any custom item (free-text add)

Each carries its own optional due date. The card shows *"next requirement due in X days."*

## 7. Personal tracking state

- No auth in v1.
- Per-user state (statuses, ticked requirements, personal notes, custom requirement items) lives in **`localStorage` in the browser**. Same device only.
- Design the data shape so we can later swap `localStorage` for a real backend without touching the UI. (Small persistence layer: `getState()` / `setState()` behind an interface.)
- Add an **Export / Import JSON** button so you can move state between devices manually before we build auth.

## 7a. Share affordance (Virgil's remix)

Every listing detail view has a **Share** button. It copies a URL of the form `/#l/[id]` that deep-links to that listing. The site's OG meta tag renders a simple share card: **"[Program name] · Deadline in [N] days · UCLA MHA."** So when a classmate drops the link in the cohort GroupMe, the card already says who it's for.

## 7b. Data freshness (Brockman's answer)

Each listing has `last_verified`. If `today - last_verified > stale_after_days` (default 45), the card shows a subtle **"verify"** affordance that opens `source_url` in a new tab. When it comes back, a one-click prompt asks: **still live / changed / dead.** That's the whole freshness loop.

## 8. Data source (v1)

- **Manually curated JSON file** committed with the site (`data/listings.json`). ~15–30 listings to start.
- Every listing has `source_url` and `last_verified`. **No scraping in v1.**

### Must-include for the seed list (per Jade)
- **UCLA Health Administrative Fellowship** (and any UCLA Health MHA-adjacent internships).
- **MBB — McKinsey, BCG, Bain.** Healthcare practice internships/fellowships (McKinsey Summer Business Analyst → Healthcare, BCG Associate Intern → healthcare tag, Bain Associate Consultant Intern → healthcare). Non-technical, aligns with MHA.
- **Big 4 — Deloitte, PwC, EY, KPMG.** Healthcare consulting / Life Sciences & Health Care internships and fellowships (e.g. Deloitte Health Care Summer Scholar, PwC Health Industries Advisory Intern, EY Health Sciences & Wellness Intern, KPMG Healthcare Advisory Intern).

### Additional sources to sweep (v1 pass)
NALHE, ACHE fellowships directory, Kaiser Permanente, Sutter Health, Providence, Cedars-Sinai, Sharp HealthCare, UCSF Health, Stanford Health Care, VA, CalOptima, LA Care, Blue Shield of CA, HHS / CMS interns, Guidehouse healthcare, HIMSS internships, digital-health non-eng roles (Verily / Alphabet health, Flatiron, Epic non-eng, Oracle Health non-eng, Innovaccer, Commure), digital-health accelerators.

*If any of the above is scraper-only (no public posting), skip until it publishes officially — no stale info.*

## 9. What is explicitly *out* of scope for v1

- Accounts / login / cross-device sync (except manual JSON export/import).
- Actually applying through the site (we always deep-link out).
- Payments, messaging, employer accounts.
- Listings that require a technical background (SWE, ML eng, data-eng hard-code roles).
- Listings that require the traveler to pay their own conference travel.
- Non-healthcare roles.
- Mobile app. (Site must be responsive, but no native app.)

## 10. Look & feel

- Clean, editorial, calm — not corporate job-board neon. FellowSource is a good tonal reference: generous type, a lot of white space, muted accent color, everything organized around **deadlines**.
- Fully responsive; readable on phone.
- Light + dark, following system.
- No dense tables until the list is > 40 items; card layout until then.

## 11. Tech (locked)

We take the **lighter static path** — plain static site, no build step, ships today:

- **Frontend:** plain `index.html` + `styles.css` + `app.js` (vanilla JS, no framework, no bundler).
- **Data:** `listings.json` served alongside.
- **State:** browser `localStorage`, with JSON import/export.
- **Hosting:** Vercel (Hobby, static site).
- **Repo:** **public** on GitHub, at `MHAinternshipwebsite`.

Rationale: no `node` on the dev machine, no `gh` CLI. Static wins on speed to live and lets us iterate through the GitHub web UI + Vercel auto-deploy. When we need SSR, a real backend, or auth, we upgrade to Next.js — the data shape is already framework-agnostic.

## 11a. Roadmap (post-v1)

- **v1.1 — client-side résumé match:** user pastes a résumé locally, we rank the listings for them. Never leaves the browser.
- **v1.2 — light auth + shared "N UCLA MHA classmates applied here":** turns the list into a small flywheel.
- **v2 — Next.js migration** once auth and server-side rendering earn their keep.

## 12. Milestones

1. **Spec approved** (this doc).
2. **Data pass 1** — I draft 15 listings in `listings.json` matching §3.
3. **Prototype UI** — home list + detail page + filters, no tracker yet. Local only.
4. **Add tracker** — statuses + requirement checklist + localStorage.
5. **Add deadlines timeline** and events (optional in v1).
6. **Polish + accessibility pass.**
7. **Push to GitHub, deploy to Vercel.**
8. **Data pass 2** — expand to 25–30 listings.

## 13. Decisions locked in (from Jade)

1. **MHA year:** Y1 Q4 by term, ~halfway through the program (part-time earlier). Prioritize **summer Y1→Y2 internships** now, include **post-grad admin fellowships** as forward-planning.
2. **Repo:** **Public** on GitHub.
3. **Name:** **MHAinternshipwebsite** (folder + repo).
4. **Must-include seeds:** **UCLA Fellowship**, **MBB** (McKinsey, BCG, Bain), **Big 4** (Deloitte, PwC, EY, KPMG). (See §8.)

## 14. Panel-driven changes rolled in (see `design_review.md`)

- **§1** rewritten as the UCLA-specific one-liner (Jobs, Socrates, Chesky).
- **§2** primary user = UCLA MHA cohort (not "West Coast").
- **§3b** geography anchored to UCLA / LA / remote-from-LA / UCLA-recruited (Socrates).
- **§4** added `ucla_history` + `stale_after_days` fields (Virgil, Brockman).
- **§5** filters cut from 8 to 3; Events page cut; post-grad behind a toggle (Jobs, Ive).
- **§6** checklist replaced by the single filling stroke (Ive).
- **§7a** share affordance with UCLA + deadline OG card (Virgil).
- **§7b** freshness loop via `last_verified` + verify prompt (Brockman).
- **§11** locked to static site path — real answer to "why is this a website?" (Jobs).
- **§11a** roadmap for résumé-match + light auth (Brockman).

## 15. Pre-deploy ritual (Chesky)

Before we hand the URL to the cohort:
- Deploy is public but **unlisted** at first.
- One UCLA MHA classmate uses it for a real application week.
- We gather five pieces of feedback in person.
- Then we drop the link in the cohort GroupMe.

*(Skipped only if Jade wants it live right now for her own use — the "do things that don't scale" gate is for the multi-user hand-off, not for her own access.)*

---

*End of v0.2 spec — panel decisions rolled in. Building §12 step 3+ next.*
