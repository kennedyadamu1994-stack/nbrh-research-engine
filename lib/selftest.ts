"use server";

import { getValidAdminSession } from "@/lib/auth/guard";
import { ensureTab, writeCell, readCell } from "@/lib/sheets/client";

/**
 * Build-step-1 acceptance test, runnable from the status page.
 *
 * Proves the one thing step 1 has to prove: the deployed app can do a
 * full read/write round trip against the STAGING spreadsheet via the
 * service account, and nothing else.
 *
 * What it does:
 *   1. Ensures a `_selftest` tab exists in the staging spreadsheet
 *      (creating it once if not).
 *   2. Writes a unique timestamped marker to `_selftest!A1`.
 *   3. Reads `_selftest!A1` straight back.
 *   4. Confirms the value read matches the value written.
 *
 * It only ever touches the staging spreadsheet's `_selftest` tab — never
 * the live spreadsheet, never any real data tab.
 */
export async function runStagingRoundTrip(): Promise<
  | { ok: true; marker: string; tabCreated: boolean; ms: number }
  | { ok: false; error: string; stage: string }
> {
  const session = await getValidAdminSession();
  if (!session) {
    return { ok: false, error: "Not signed in.", stage: "auth" };
  }

  const started = Date.now();
  const marker = `nbrh-research-engine selftest ${new Date().toISOString()} #${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  let tabCreated = false;
  try {
    tabCreated = await ensureTab("staging", "_selftest");
  } catch (err) {
    return {
      ok: false,
      stage: "ensure _selftest tab",
      error: err instanceof Error ? err.message : "Unknown error creating the _selftest tab.",
    };
  }

  try {
    await writeCell("staging", "_selftest!A1", marker);
  } catch (err) {
    return {
      ok: false,
      stage: "write _selftest!A1",
      error: err instanceof Error ? err.message : "Unknown error writing to staging.",
    };
  }

  let readBack: string;
  try {
    readBack = await readCell("staging", "_selftest!A1");
  } catch (err) {
    return {
      ok: false,
      stage: "read _selftest!A1",
      error: err instanceof Error ? err.message : "Unknown error reading from staging.",
    };
  }

  if (readBack !== marker) {
    return {
      ok: false,
      stage: "verify",
      error: `Wrote "${marker}" but read back "${readBack}". The round trip did not match.`,
    };
  }

  return { ok: true, marker, tabCreated, ms: Date.now() - started };
}
