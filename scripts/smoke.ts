/**
 * Headless build-step-1 check. Runs the same two things the status page
 * does — Neon connectivity and the staging spreadsheet read/write round
 * trip — without needing the dev server or a login. Handy for verifying
 * credentials straight after setting .env.local, and as a quick
 * post-deploy sanity check.
 *
 *   npm run smoke
 *
 * Only ever touches `_selftest!A1` in the staging spreadsheet.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // no .env.local — vars may be set in the real environment
  }
}

loadEnvLocal();

async function main() {
  const { checkDbConnection } = await import("../lib/db/client");
  const { ensureTab, writeCell, readCell } = await import("../lib/sheets/client");

  let failures = 0;

  process.stdout.write("Neon database … ");
  const db = await checkDbConnection();
  if (db.ok) {
    console.log("OK");
  } else {
    failures++;
    console.log("FAILED\n  " + db.error);
  }

  process.stdout.write("Staging spreadsheet round trip … ");
  try {
    const marker = `smoke ${new Date().toISOString()} #${Math.random().toString(36).slice(2, 8)}`;
    const created = await ensureTab("staging", "_selftest");
    await writeCell("staging", "_selftest!A1", marker);
    const back = await readCell("staging", "_selftest!A1");
    if (back === marker) {
      console.log("OK" + (created ? " (created _selftest tab)" : ""));
    } else {
      failures++;
      console.log(`FAILED\n  wrote "${marker}" but read back "${back}"`);
    }
  } catch (err) {
    failures++;
    console.log("FAILED\n  " + (err instanceof Error ? err.message : String(err)));
  }

  console.log("");
  if (failures === 0) {
    console.log("All checks passed. Build step 1 works against the real services.");
  } else {
    console.log(`${failures} check(s) failed — see above.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
