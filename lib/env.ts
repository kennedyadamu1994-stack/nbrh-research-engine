/**
 * Single place every environment variable is read from. Nothing else in
 * the codebase touches process.env directly — that keeps the "what does
 * this app need configured" question answerable by reading one file, and
 * means a missing var fails with a clear, named error instead of a
 * downstream `undefined` that surfaces as something cryptic three calls
 * later.
 *
 * `requireEnv` throws; the callers that need a hard dependency (the Sheets
 * client, the Postgres client) call it lazily at first use, never at
 * module load, so that `next build` — which evaluates modules in an
 * environment that legitimately has no secrets — doesn't fall over.
 *
 * `readEnvStatus` is the non-throwing counterpart: it reports which vars
 * are present as plain booleans (never the values themselves) so the
 * status page can show a readiness checklist without ever risking a
 * secret reaching the browser.
 */

export type EnvVarName =
  | "GOOGLE_SERVICE_ACCOUNT_EMAIL"
  | "GOOGLE_PRIVATE_KEY"
  | "STAGING_SPREADSHEET_ID"
  | "POSTGRES_URL"
  | "ANTHROPIC_API_KEY";

// Note: there is deliberately no LIVE_SPREADSHEET_ID. Decision D2
// (docs/DECISIONS.md) — the tool never reads or writes the live NBRH
// spreadsheet; approved rows are copied across by hand.

/**
 * Vars that must be set for build step 1 to work end to end (the app
 * running, auth working, the staging round-trip succeeding). LIVE_… and
 * ANTHROPIC_… are deliberately excluded — they belong to later steps and
 * requiring them now would block a legitimate step-1 deploy.
 */
export const REQUIRED_FOR_STEP_1: EnvVarName[] = [
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "STAGING_SPREADSHEET_ID",
  "POSTGRES_URL",
];

export const ALL_ENV_VARS: EnvVarName[] = [
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "STAGING_SPREADSHEET_ID",
  "POSTGRES_URL",
  "ANTHROPIC_API_KEY",
];

export function requireEnv(name: EnvVarName): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Set it in .env.local for local dev, or in the Vercel project's ` +
        `Environment Variables for the deployed app. See .env.example.`,
    );
  }
  return value;
}

export function getEnv(name: EnvVarName): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

export interface EnvStatus {
  name: EnvVarName;
  present: boolean;
  requiredForStep1: boolean;
}

/** Presence only — never returns or logs the actual values. */
export function readEnvStatus(): EnvStatus[] {
  return ALL_ENV_VARS.map((name) => ({
    name,
    present: getEnv(name) !== undefined,
    requiredForStep1: REQUIRED_FOR_STEP_1.includes(name),
  }));
}

/** True when every step-1-required var is present. */
export function isStep1Configured(): boolean {
  return REQUIRED_FOR_STEP_1.every((name) => getEnv(name) !== undefined);
}
