# NBRH RESEARCH ENGINE — CLAUDE.md (non-negotiables)

A research and data-verification tool for The NBRH. It runs verified web-research
passes against Kennedy's Google Sheets and stages the results in a separate
"Pending Review" spreadsheet for his manual approve / reject workflow. It is the
backbone dataset other NBRH tools depend on, so it is built to be robust, not
fast.

Full context: `docs/spec.md` (the technical spec), `docs/kickoff.md` (the
start-here brief), and `docs/DECISIONS.md` (choices Kennedy has made that
override the spec/kickoff where they differ). **Read all three before touching
anything.**

## Rules that apply to every session

1. **Column classification is enforced in code, not prompts.** Every column
   across the 14 worksheets is RESEARCH / SYSTEM / EDITORIAL / DERIVED
   (`docs/spec.md` §1). The research engine is only ever handed RESEARCH +
   DERIVED columns as targets — it never receives SYSTEM or EDITORIAL column
   names at all. A fabricated influencer rate card or a guessed safeguarding
   claim is worse than a blank cell.
2. **Neighbours worksheet is out of scope entirely.** It holds members' personal
   data. No code path reads, writes, or references it.
3. **The tool never touches the live NBRH spreadsheet — read or write**
   (decision D2). The engine and dashboard only ever use the staging
   spreadsheet. Approving a row marks it approved in staging and logs to
   `_feedback_log`; it publishes nowhere. Kennedy copies approved rows into the
   live Sheets by hand. There is no `LIVE_SPREADSHEET_ID` and no live target in
   `lib/sheets/client.ts`.
4. **Every entity is checked against `_rejected_log` before it can be staged**,
   and anything matching is skipped (`docs/spec.md` §2.4).
5. **Verification bar per entity:** 3–4 independent proof points, per-field
   confidence (not just per-row), fetch-and-read of the actual pages (not search
   snippets), name-collision disambiguation, and a "not found" report for
   anything searched but unconfirmed.
6. **Budget is a hard constraint: under £50/month.** Every run logs its actual
   token + search cost as an approximate £ figure against a running monthly
   total. New runs are blocked once the month's spend is near £50, with an
   explicit override — never a silent stop.
7. **Manual trigger only.** No scheduled or automatic runs until Kennedy says
   otherwise.
8. **Build sequentially, verify each step before the next.** A broken early step
   quietly breaking a later one is the failure mode to avoid. Venues first, end
   to end, before any other worksheet.
9. **Flag, don't guess.** Any column that doesn't clearly fit the classification;
   any budget trade-off (fewer candidates vs less frequent runs); any Anthropic
   API detail you're unsure of (check current docs, don't rely on training
   data) — surface it to Kennedy, don't pick a default.

## Auth

Ported from Club House OS: email + password, scrypt hashing (`lib/auth/`),
sessions in a Neon Postgres database (`research_admin_users`,
`research_admin_sessions`, created lazily). `requireAdminOrRedirect()` guards
every protected page; `getValidAdminSession()` guards every sensitive server
action independently. This database is separate from the Club House OS one.

## Stack

Next.js 15.5 (App Router) on Vercel · TypeScript · `googleapis` for Sheets via a
service account (credentials in env vars, never committed) · `@neondatabase/serverless`
for the auth store · Anthropic API with the web search tool for research (added
at build step 3).

## Design tokens (match Club House OS)

Dark `#1B1B1B` background · hot pink `#FF1B6E` accent · Young Serif headings ·
DM Sans body · 4px radius. Text on solid pink is always white. Tokens live in
`app/globals.css`; reference copy in `lib/brand.ts`.

## Build order (`docs/spec.md` §6, `docs/kickoff.md`)

1. **Scaffold + Sheets connection.** ← current step. App builds, deploys, auth
   works, and can read/write a test value to the staging spreadsheet. Done when
   that round trip passes on the deployed app.
2. **Staging spreadsheet structure.** Create `_rejected_log` and `_feedback_log`
   tabs with the schema the engine and dashboard expect.
3. **Research engine as a single-worksheet API route — Venues first.** Manual
   trigger, Claude API + web search, populates RESEARCH/DERIVED columns only,
   checks `_rejected_log`, writes to staging, logs per-run cost against the
   monthly total. Test end to end.
4. **Review dashboard, Venues only.** List (filter/sort by confidence), per-row
   detail with source URLs + confidence tiers, approve / reject / approve-with-edit
   → `_feedback_log`, per-run "not found" panel, run history. Approve marks the
   row approved in staging only — it does not publish (D2). No bulk or
   auto-approve.
5. **Extend to the remaining in-scope worksheets**, one at a time, same pipeline
   with per-worksheet column configs. Neighbours excluded.
6. **No scheduled runs.** Manual trigger only until Kennedy revisits it.
