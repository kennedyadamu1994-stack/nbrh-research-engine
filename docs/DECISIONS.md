# Decisions taken during the build

Decisions Kennedy has made that resolve or modify something in `docs/spec.md` or
`docs/kickoff.md`. Those two files are left as originally written; **this file is
the source of truth wherever they differ.**

---

## D1 — 2026-09-06 — Auth database is a standalone Neon project

Kennedy chose "separate database, same style" over reusing the Club House OS
database. This tool's Neon project is its own, holds only the auth tables
(`research_admin_users`, `research_admin_sessions`, `research_`-prefixed), and
never reads or writes Club House OS data.

## D2 — 2026-09-06 — The tool never touches the live NBRH spreadsheet

Supersedes the auto-publish step in `docs/kickoff.md` step 5 and the approve
action in `docs/spec.md` §4.

Kennedy wants the research data and the live NBRH data kept completely separate,
under his direct manual control. So:

- The engine and the review dashboard read and write the **staging spreadsheet
  only** (`STAGING_SPREADSHEET_ID`), including its `_rejected_log` and
  `_feedback_log` tabs.
- There is **no `LIVE_SPREADSHEET_ID`** and **no live target** in
  `lib/sheets/client.ts`. The tool has neither write nor read access to the live
  spreadsheet.
- **Approving** a row in the dashboard marks it approved in staging and appends
  the decision to `_feedback_log`. It does not publish anywhere.
- **Kennedy copies approved rows into the live Sheets by hand.**

Open sub-question, not blocking: whether the engine should later get *read-only*
access to the live sheet purely to skip entities that already exist there
(dedup). Default for now: **no** — revisit only if duplicate candidates become a
real nuisance in review.
