# MHA Internships & Fellowships · CA

**The list of fellowships and internships, by deadline. For California MHA students.**

Made for every California MHA student — new program, part-time or full-time, current or recently graduated. If it's not something a CA MHA student can realistically land, it's not on the list.

## What's here

- `index.html` — the site (one page, three views: Browse, My dashboard, About).
- `styles.css` — one stylesheet. Light + dark, editorial, calm.
- `app.js` — vanilla JS. Hash routing, filters, localStorage tracker, data-driven Category and City filters.
- `listings.json` — the curated data.
- `favicon.svg`, `og.svg` — the vertical stroke that is the signature.
- `scripts/validate-listings.mjs` — the validator (R1–R10).
- `.github/workflows/validate.yml` — runs the validator on every PR + push to main.
- `.github/workflows/monthly-linkcheck.yml` — monthly link re-check with fail-closed auto-commit and auto-filed issue on breakage.
- `.github/ISSUE_TEMPLATE/add-listing.yml` — the submission form.
- `.github/ISSUE_TEMPLATE/broken-link.yml` — the broken-link report form.
- `.githooks/pre-commit` — opt-in local check (runs if Node is installed).

## Validator rules

Every PR runs `scripts/validate-listings.mjs`. A listing passes only if:

- **R1** — `program_type` is `internship` or `fellowship`; `duration_months` is set; title contains a program keyword. Permanent-role postings rejected.
- **R2** — If `format` is onsite or hybrid, at least one location must be in California.
- **R3** — If `format` is remote, locations may be anywhere.
- **R4** — Every `source_url` returns a non-error HTTP response. Hard failures (4xx not 429, DNS, connection refused) are actionable; soft failures (timeout, 5xx, 429) are transient and ignored.
- **R5** — Required fields present and typed correctly.
- **R6** — `tier` is 1 or 2.
- **R7** — No duplicate ids.
- **R8** — `pathway` is `undergrad`, `advanced_degree`, or `single`.
- **R9** — `url_kind` is `generic` (links to a company careers page) or `program` (links to a dedicated program page). Drives the button label on each listing.
- **R10** — `added_at` is an ISO date (YYYY-MM-DD). Drives the "Just added" chip for 14 days.

## Monthly link check — fail-closed loop

Every month (first Monday, ~8am Pacific):

1. The validator runs with `CHECK_LINKS=1`.
2. Any **hard** failures (confirmed 4xx, DNS, connection refused) → the listing's `link_status` auto-flips to `"pending"` via a commit tagged `[linkcheck-bot]`.
3. The site renders the "Link pending — re-verifying" state for that listing.
4. A GitHub issue is auto-filed with the full report.
5. Both `validate.yml` and `monthly-linkcheck.yml` skip when the triggering commit is from the bot (prevents infinite loops).
6. **Transient failures** (timeout, 5xx, rate-limit) are logged but **do not flip** anything, to avoid false pendings.

## Submitting a listing

Click **Add a listing ↗** at the bottom of the home page, or open the [Add-a-listing issue form](https://github.com/jadeelese/MHAinternshipwebsite/issues/new?template=add-listing.yml). Submissions are reviewed before they go live.

## Local dev

Any static server works:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. To run the validator locally:

```bash
node scripts/validate-listings.mjs listings.json       # schema + rules
CHECK_LINKS=1 node scripts/validate-listings.mjs listings.json   # + live link check
```

To enable the pre-commit hook:

```bash
git config core.hooksPath .githooks
```

## Deploy

Vercel auto-deploys the `main` branch — no build command needed.

## License

MIT.
