# Kickoff Brief: The NBRH Research Engine

Give Claude Code this brief plus the attached spec document (`nbrh-research-tool-spec.md`) at the start of a fresh session in the new empty repo.

---

## What this is

We're building a research and data-verification tool for The NBRH, a grassroots sports discovery platform in London. The full architecture, column classification, and all design decisions are in the attached spec. Read it in full before writing any code. This brief is just the "start here" layer on top of it.

## Before you start

Confirm the following are in place. If any are missing, stop and tell Kennedy what's needed rather than guessing or stubbing around it:

1. A Google Cloud service account with Sheets API access, credentials available as environment variables (never hardcoded or committed).
2. The new staging Google spreadsheet created and shared with that service account.
3. This repo connected to a Vercel project.
4. An Anthropic API key with billing set up, available as an environment variable.

## Build order (from spec Section 6)

Work through these in order. Don't jump ahead to step 3 before step 1 and 2 are actually working, this is meant to be a robust backbone system, not a fast prototype, and each step should be verified before moving on.

1. **Scaffold the repo.** Next.js on Vercel, matching the stack of Kennedy's existing "Engine" repo (ask Kennedy for that repo if useful as a reference for auth pattern and conventions). No research logic yet. Just confirm the app builds, deploys, and can read/write a test value to the staging spreadsheet via the service account. This step is done when that round trip works.

2. **Build the staging spreadsheet structure.** Create the `_rejected_log` and `_feedback_log` tabs per the spec (Section 2.1, 2.4). Confirm the schema matches what the research engine and dashboard will expect before moving on.

3. **Build the research engine as a single-worksheet API route.** Start with **Venues** (per spec Section 6, it maps cleanest to the existing Engine's confidence-scoring precedent). This route should:
   - Accept a manual trigger with the run parameters described in the earlier prompt work (worksheet, category focus, target rows, minimum candidates to check).
   - Call the Claude API with web search as a tool.
   - Populate only the RESEARCH and DERIVED columns for Venues, per the classification table in spec Section 1. Never touch SYSTEM or EDITORIAL columns, the engine shouldn't even receive those column names as targets.
   - Enforce the verification requirements from the earlier prompt work: 3-4 independent proof points per entity, per-field confidence, fetch-and-read of actual pages rather than relying on search snippets, name-collision disambiguation, and a "not found" report for anything searched but unconfirmed.
   - Check the `_rejected_log` before including any entity, and skip anything that matches per spec Section 2.4.
   - Write results to the staging spreadsheet, not the live Sheets.
   - **Log per-run cost** (tokens and searches used, converted to an approximate £ figure) and check that against a running monthly total. Per spec Section 5, the budget is under £50/month. Block new runs once that's close to being hit, with an explicit override option rather than a hard silent stop.
   - Test this route end to end manually before moving on: trigger a run, confirm rows land in staging with cost logged, confirm nothing writes to live Sheets.

4. **Build the review dashboard**, scoped initially to Venues only. Per spec Section 4: list view of pending rows (filterable, sortable by confidence), per-row detail view with source URLs and confidence tiers, approve/reject/approve-with-edit actions that write to `_feedback_log`, a "not found" panel per run, basic run history. No bulk-approve or auto-approve in this version, per the spec, everything passes through Kennedy's review for now.

5. **Only once Venues works end to end** (trigger → staged with cost logged → reviewed in dashboard → approved rows land correctly in the live Venues sheet, rejected entities correctly skip on the next run) — extend the engine to the remaining in-scope worksheets from the spec, one at a time, reusing the same pipeline with per-worksheet column configs. **Neighbours is excluded entirely** per spec Section 1, do not build any path that touches that sheet.

6. Do not build scheduled/automatic runs. Per spec Section 5, this stays manual-trigger only until Kennedy says otherwise.

## Things to flag back to Kennedy, not solve unilaterally

- Any column in a worksheet that doesn't clearly fall into RESEARCH/SYSTEM/EDITORIAL/DERIVED per the spec's classification, don't guess, ask.
- Any point where hitting the £50/month budget would require either fewer candidates checked per run or less frequent runs, that trade-off is Kennedy's call, not a default to silently apply.
- Any Anthropic product/API detail you're unsure of (rate limits, available tools, model names), don't assume, check current documentation rather than relying on training data.

## Working style

Match the existing NBRH design system where the dashboard has any UI surface: dark `#1B1B1B` background, hot pink `#FF1B6E` accent, Young Serif headings, DM Sans body, 4px border radius (per Kennedy's existing "Club House OS" system). Build incrementally and confirm each stage works before adding the next, this is infrastructure other tools will depend on, so a broken step 2 quietly breaking step 4 later is the failure mode to avoid.
