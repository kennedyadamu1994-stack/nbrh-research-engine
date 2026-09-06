/**
 * Deletes an admin account and all its active sessions.
 *
 *   npm run delete-admin -- email@to-remove.com
 *
 * Two uses:
 *   - removing an account created by mistake
 *   - the "change my password" path: delete, then re-run create-admin
 *     (there's deliberately no in-place password reset — see
 *     scripts/create-admin.ts)
 *
 * Local only, same as create-admin — never deployed, never a web route.
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
  const [, , email] = process.argv;
  if (!email) {
    console.error("Usage: npm run delete-admin -- email@to-remove.com");
    process.exit(1);
  }

  const { getSql } = await import("../lib/db/client");
  const sql = getSql();
  const normalised = email.trim().toLowerCase();

  await sql`DELETE FROM research_admin_sessions WHERE email = ${normalised};`;
  const removed = (await sql`
    DELETE FROM research_admin_users WHERE email = ${normalised} RETURNING email;
  `) as { email: string }[];

  if (removed.length > 0) {
    console.log(`Removed admin account ${normalised} and any active sessions.`);
  } else {
    console.log(`No admin account ${normalised} — nothing to remove.`);
  }
}

main().catch((err) => {
  console.error("Failed to delete admin account:", err);
  process.exit(1);
});
