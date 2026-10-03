# MHAinternshipwebsite

**The list of fellowships and internships, by deadline. For California MHA students.**

Made for every California MHA student — new program, part-time or full-time, current or recently graduated. If it's not something a CA MHA student can realistically land, it's not on the list.

## What's in the repo

- `index.html` — the site (one page, three views: Browse, My dashboard, About).
- `styles.css` — one stylesheet. Light + dark, editorial, calm.
- `app.js` — vanilla JS. Hash routing, filters, localStorage tracker, data-driven category and city filters.
- `listings.json` — the curated data (50+ programs across industries).
- `favicon.svg`, `og.svg` — the vertical stroke that is the visual signature.
- `.github/ISSUE_TEMPLATE/add-listing.yml` — the submission form.
- `spec.md`, `design_review.md`, `playbook_v0.3.html`, `playbook_v2_build.html` — the paper trail.

## Submitting a listing

Hit **Add a listing ↗** at the bottom of the home page, or go directly to the [Add-a-listing issue form](https://github.com/jadeelese/MHAinternshipwebsite/issues/new?template=add-listing.yml). Jade reviews each submission before it goes live.

## Why static

No `node`, no bundler, no build step. Ships in minutes. When the site earns a submission form that doesn't need manual review, we upgrade (see v3 roadmap in `playbook_v2_build.html`).

## Local dev

Any static server works:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Vercel auto-deploys the `main` branch as a static site — no build command needed.

## Data freshness

Every listing has `last_verified` and a tier label (1 or 2) internally. **Always confirm the deadline on the official source before you apply** — program deadlines shift each cycle.

## License

MIT — see `LICENSE`.
