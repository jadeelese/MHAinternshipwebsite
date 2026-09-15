# Design Review — pre-deploy panel

Date: 2026-09-14
Product: **MHAinternshipwebsite** (v1)
Primary user: **Jade + the UCLA MHA cohort.**

Panel: Steve Jobs, Brian Chesky, Socrates, Greg Brockman, Virgil Abloh, Jony Ive.

---

## Steve Jobs

1. What's the one job this does that no other tool does? One sentence. If you can't, you're not ready.
2. Three categories, four filter axes, a tracker, a timeline — cut half. What survives?
3. Why is this a website and not a group thread in the UCLA MHA cohort? Are you sure the container is right?

## Brian Chesky

1. Sketch the 11-star version. Is it a dashboard, or a second-year at UCLA handing you three listings and saying "apply to these this week"? Work backward from that.
2. Who is the first UCLA student you hand this to? What would make them screenshot it and drop it in the cohort GroupMe?
3. Is this a place or a tool? A place has a personality. A tool is just used. Which is this?

## Socrates

1. What is a "fellowship"? Are you certain the things on your list share an essence, or only a name?
2. Do you want users to find the right role, or to become the kind of person who chooses well among roles? Those are different sites.
3. If in one year only Jade uses it — has it failed?

## Greg Brockman

1. Where's the compounding loop? Does each user make it better for the next, or is this a static list forever?
2. Fifteen listings you can eyeball. Where's the version where a model reads the résumé and returns "these ten this week"?
3. How do you keep the data fresh without becoming a full-time curator?

## Virgil Abloh

1. 3% rule — what did you change 3% from FellowSource? Name it. If you can't, it's a copy.
2. What does the URL look like? What does the meta card look like when a UCLA classmate drops the link into a chat?
3. Where is the tension in the design? Everything calm is wallpaper. What is the one thing that grabs?

## Jony Ive

1. What can be subtracted and still leave the essence intact?
2. What is the smallest possible moment of care — the detail that tells a UCLA student "someone made this for me"?
3. In the tracker, is a checkbox really the metaphor for "I submitted my letter of intent"?

---

## Collective answers

**1. What is this, in one sentence.** (Jobs, Socrates, Chesky)
*"The list of fellowships and internships a UCLA MHA student should actually apply to this year, tracked from deadline to offer."*
Not a global job board. Not FellowSource for MHA. The **UCLA-cohort inside list**. That framing decides what belongs (only what a UCLA MHA can realistically get) and what doesn't (generic ACHE aggregation).

**2. What we cut.** (Jobs, Ive)
- Events page — folded into each listing's card as inline dates.
- Eight filters → three: *Category, Deadline window, My status.* Everything else drops into a "More filters" drawer.
- Post-grad admin fellowships hidden behind a single toggle. Y1→Y2 summer is the front door.

**3. UCLA-first, not California-first.** (Chesky, Socrates)
Old rule was West Coast. New rule: **doable from UCLA / LA, OR remote-from-LA, OR UCLA-recruited.** SF/SD/other stay valid, but the anchor is Westwood.

**4. The 3% remix from FellowSource.** (Abloh)
Three visible differences, said out loud on About:
- **UCLA-specific curation** — each listing carries a `ucla_history` chip (`hosted UCLA alum` / `UCLA-recruited` / `unknown`).
- **Requirement-first framing** — home headline is *"Your next deadline: X in N days,"* not the program grid.
- **Share card built into the URL** — OG image reads "Recommended for UCLA MHA · Deadline in N days."

**5. AI hook — later, not now.** (Brockman)
v1.1: paste résumé locally (client-side, never sent) → site ranks the listings. v2: light auth + anonymous "N UCLA MHAs applied here last cycle." Compound loop starts there.

**6. Freshness loop.** (Brockman)
`last_verified` on every listing. `today - last_verified > 45d` → card shows a subtle **verify** affordance. One click opens the source, one click after to mark still-live / changed / dead.

**7. The one moment of craft.** (Ive, Abloh)
The requirement tracker is **not checkboxes.** A **single short vertical stroke** to the left of each row that fills as requirements are ticked; closes into a filled circle when the application is submitted. That stroke is the only accent color on the page. It is the design signature.

**8. First hand-off.** (Chesky)
Before we drop the link in the cohort chat: one UCLA MHA classmate uses it for a real application week and tells us what's missing. Gather five pieces of feedback. Then share.

**9. Success at one year.** (Socrates)
If only Jade uses it *and* she got an offer she wouldn't have found otherwise → success. Cohort adoption is a bonus, not the definition.

---

*Every point above is now reflected in `spec.md` v0.2 (§14 lists them).*
