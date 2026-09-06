# NBRH Research Engine

Verified web-research runs against The NBRH's Google Sheets, with a review
dashboard for a manual approve / reject workflow. Results are staged in a
separate "Pending Review" spreadsheet — nothing reaches the live data without
passing through review.

Architecture and decisions: [`docs/spec.md`](docs/spec.md).
Build brief: [`docs/kickoff.md`](docs/kickoff.md).
Working rules: [`CLAUDE.md`](CLAUDE.md).

## Status

**Build step 1 — scaffold + Sheets connection.** Next.js app, email/password
auth (ported from Club House OS), and a status page that verifies the staging
spreadsheet read/write round trip. No research logic yet.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and fill in the real values:

   ```bash
   cp .env.example .env.local
   ```

   For build step 1 you need `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`,
   `STAGING_SPREADSHEET_ID`, and `POSTGRES_URL`. The service account email must be
   shared on the staging spreadsheet as an Editor. The staging spreadsheet is the
   only spreadsheet this tool touches — see [`docs/DECISIONS.md`](docs/DECISIONS.md)
   D2.

3. Create your admin login (writes to the Neon database in `POSTGRES_URL`):

   ```bash
   npm run create-admin -- you@email.com "a strong password"
   ```

4. Run it:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 — you'll be redirected to `/login`. Sign in, then
   run the round-trip test on the status page.

## Deployment

Vercel, connected to this GitHub repo. Set the same environment variables in the
Vercel project's **Settings → Environment Variables**. `GET /api/health` is an
unauthenticated liveness check that reports which vars are configured (booleans
only, never values).

## Layout

```
app/            Next.js App Router — login page, protected status page, /api/health
components/     Client components (login form, self-test panel, sign-out)
lib/env.ts      The one place environment variables are read
lib/sheets/     Google Sheets client (service account auth, read/write helpers)
lib/db/         Neon Postgres handle
lib/auth/       Email/password auth, scrypt hashing, session store, guards
lib/selftest.ts Build-step-1 staging round-trip server action
scripts/        create-admin.ts (one-time, local only)
docs/           spec.md, kickoff.md
```
