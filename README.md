# MHA Internships & Fellowships · CA

**The list of fellowships and internships, by deadline. For California MHA students.**

Made for every California MHA student — new program, part-time or full-time, current or recently graduated. If it's not something a CA MHA student can realistically land, it's not on the list.

## What's here

- `index.html` — the site (one page, three views: Browse, My dashboard, About).
- `styles.css` — one stylesheet. Light + dark, editorial, calm.
- `app.js` — vanilla JS. Hash routing, filters, localStorage tracker, data-driven Category and City filters.
- `listings.json` — the curated data.
- `favicon.svg`, `og.svg` — the vertical stroke that is the signature.
- `scripts/validate-listings.mjs` — the validator (R1–R8).
- `.github/workflows/validate.yml` — runs the validator on every PR + push to main.
- `.github/workflows/weekly-linkcheck.yml` — re-checks every link weekly; auto-files an issue on breakage.
- `.github/ISSUE_TEMPLATE/add-listing.yml` — the submission form.
- `.github/ISSUE_TEMPLATE/broken-link.yml` — the broken-link report form.
- `spec.md`, `design_review.md`, `playbook_v0.3.html`, `playbook_v2_build.html` — the paper trail.

## Validator rules

Every PR runs `scripts/validate-listings.mjs`. A listing passes only if:

- **R1** — `program_type` is `internship` or `fellowship`; `duration_months` is set; title contains a program keyword. Permanent-role postings rejected.
- **R2** — If `format` is onsite or hybrid, at least one location must be in California.
- **R3** — If `format` is remote, locations may be anywhere.
- **R4** — Every `source_url` returns a non-error HTTP response.
- **R5** — Required fields present and typed correctly.
- **R6** — `tier` is 1 or 2.
- **R7** — No duplicate ids.
- **R8** — `pathway` is `undergrad`, `advanced_degree`, or `single`.

Red X on the PR → can't merge. Weekly link check auto-files an issue when a URL breaks.

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

## Deploy

Vercel auto-deploys the `main` branch as a static site — no build command needed.

## Data freshness

Every listing has `last_verified`, `link_status`, and `link_last_checked`. The weekly action keeps `link_status` honest. **Always confirm the deadline on the official source before you apply** — program deadlines shift each cycle.

## License

MIT — see `LICENSE`.
