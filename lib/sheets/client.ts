import { google } from "googleapis";
import { requireEnv } from "@/lib/env";

/**
 * Google Sheets access for the research engine. Auth pattern is lifted
 * directly from Club House OS's lib/data/sheets/client.ts (same service
 * account mechanism, same private-key normalisation), so the two repos
 * behave identically against Google's API.
 *
 * Two hard rules this module exists to enforce:
 *   1. The engine writes to STAGING only. `spreadsheetFor("live")` exists
 *      for a later build step (publishing approved rows) and is not called
 *      anywhere in build step 1.
 *   2. Auth and the client are built lazily, at first real call — never at
 *      module load — so `next build` in a secret-less environment doesn't
 *      throw.
 */

export type SpreadsheetTarget = "staging" | "live";

const ENV_FOR_TARGET: Record<SpreadsheetTarget, "STAGING_SPREADSHEET_ID" | "LIVE_SPREADSHEET_ID"> = {
  staging: "STAGING_SPREADSHEET_ID",
  live: "LIVE_SPREADSHEET_ID",
};

function spreadsheetIdFor(target: SpreadsheetTarget): string {
  return requireEnv(ENV_FOR_TARGET[target]);
}

let cachedClient: ReturnType<typeof google.sheets> | null = null;

function getClient() {
  if (cachedClient) return cachedClient;

  const email = requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const rawKey = requireEnv("GOOGLE_PRIVATE_KEY");

  // Vercel's env var UI can turn a literal `\n` into a real newline OR
  // leave it as the two-character escape, depending on how it was pasted.
  // Normalise the escape case rather than assuming one — this is the single
  // most common real-world failure point for a service account key.
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

/**
 * Lists the tab (worksheet) titles in a spreadsheet. Used to decide
 * whether a tab needs creating before a write.
 */
export async function listTabTitles(target: SpreadsheetTarget): Promise<string[]> {
  const client = getClient();
  const res = await client.spreadsheets.get({
    spreadsheetId: spreadsheetIdFor(target),
    fields: "sheets.properties.title",
  });
  return (res.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => typeof t === "string");
}

/**
 * Creates a tab if it isn't already there. No-op (returns false) when the
 * tab already exists, so it's safe to call unconditionally before a write.
 */
export async function ensureTab(target: SpreadsheetTarget, tabName: string): Promise<boolean> {
  const existing = await listTabTitles(target);
  if (existing.includes(tabName)) return false;

  const client = getClient();
  await client.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetIdFor(target),
    requestBody: {
      requests: [{ addSheet: { properties: { title: tabName } } }],
    },
  });
  return true;
}

/**
 * Reads a range as raw string rows (row 0 = whatever's in the first row
 * of the range). Returns [] for an empty range rather than throwing.
 */
export async function readRange(target: SpreadsheetTarget, range: string): Promise<string[][]> {
  const client = getClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: spreadsheetIdFor(target),
    range,
  });
  return (res.data.values as string[][] | undefined) ?? [];
}

/** Convenience: read a single cell's value, or "" if the cell is blank. */
export async function readCell(target: SpreadsheetTarget, range: string): Promise<string> {
  const rows = await readRange(target, range);
  return rows[0]?.[0] ?? "";
}

/**
 * Writes values into a range, overwriting whatever's there. `values` is
 * row-major (an array of rows, each an array of cell values).
 */
export async function writeRange(
  target: SpreadsheetTarget,
  range: string,
  values: (string | number | boolean)[][],
): Promise<void> {
  const client = getClient();
  await client.spreadsheets.values.update({
    spreadsheetId: spreadsheetIdFor(target),
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

/** Convenience: write a single cell. */
export async function writeCell(
  target: SpreadsheetTarget,
  range: string,
  value: string | number | boolean,
): Promise<void> {
  await writeRange(target, range, [[value]]);
}

/**
 * Appends a row to the end of a tab's used range. Google figures out the
 * next empty row itself, so this is safe against concurrent-ish writes in
 * a way that "compute the row number then write to it" is not.
 */
export async function appendRow(
  target: SpreadsheetTarget,
  tabName: string,
  row: (string | number | boolean)[],
): Promise<void> {
  const client = getClient();
  await client.spreadsheets.values.append({
    spreadsheetId: spreadsheetIdFor(target),
    range: tabName,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
