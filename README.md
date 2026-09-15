# MHAinternshipwebsite

**The list of fellowships and internships a UCLA MHA student should actually apply to this year, tracked from deadline to offer.**

Not a global job board. Not FellowSource-for-MHA. The UCLA-cohort inside list. Made for the UCLA MHA cohort by a classmate.

## What's in the repo

- `index.html` — the site (one page, three views: Browse, My dashboard, About).
- `styles.css` — one stylesheet. Light + dark, editorial, calm.
- `app.js` — vanilla JS. Hash routing, filters, localStorage tracker.
- `listings.json` — the curated data.
- `favicon.svg`, `og.svg` — the little vertical stroke that's the visual signature.
- `spec.md` — product spec.
- `design_review.md` — the pre-deploy panel review (Jobs, Chesky, Socrates, Brockman, Abloh, Ive).

## Why static

No `node`, no bundler, no build step. Ships today. When the site earns SSR / real auth / an API, we upgrade to Next.js.

## Local dev

Any static server works — for example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Vercel auto-deploys the `main` branch as a static site — no build command needed.

## Data freshness

Every listing has `last_verified` and a `stale_after_days` window (default 45). Cards past that window show a small "verify" chip that opens the source URL. **Always confirm the deadline on the source page before you apply.** Program deadlines shift each cycle; this repo is not a source of truth.

## Contributing

- **Add a listing:** open `listings.json`, add an entry, keep the field shape, set `last_verified` to today's date. Verify the eligibility rules in `spec.md` §3 first.
- **Fix a listing:** update the fields and bump `last_verified`.
- **Talk about it:** open an issue.

## License

MIT — see `LICENSE`.
