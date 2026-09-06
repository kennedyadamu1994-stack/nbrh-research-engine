/**
 * One-time admin account setup.
 *
 * Deliberately a command-line script, never a web page or API route — a
 * public "create admin account" endpoint would itself be a vulnerability.
 * This only ever runs on Kennedy's own machine against the real database,
 * never deployed, never reachable over the web.
 *
 * Usage (run locally, with the real POSTGRES_URL in your environment —
 * it's read from .env.local automatically by the loader below):
 *
 *   npm run create-admin -- you@email.com "a real strong password"
 *
 * Refuses to overwrite an existing admin account — this is account
 * CREATION, not a password-reset tool. To change a password, delete the
 * row from research_admin_users directly and re-run this.
 *
 * (Ported from Club House OS's scripts/create-admin.ts.)
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Minimal .env.local loader so this script doesn't need dotenv as a dep.
// Only fills vars that aren't already set in the real environment.
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
    // No .env.local — fine, the vars might be set in the real environment.
  }
}

loadEnvLocal();

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- you@email.com "your password"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  // Imported after loadEnvLocal() so POSTGRES_URL is populated first.
  const { hashPassword } = await import("../lib/auth/password");
  const { createAdminUser } = await import("../lib/auth/store");

  const passwordHash = await hashPassword(password);
  const result = await createAdminUser(email, passwordHash);
  if (result.created) {
    console.log(`Admin account created for ${email.trim().toLowerCase()}.`);
  } else {
    console.log(
      `An admin account for ${email.trim().toLowerCase()} already exists, nothing changed. ` +
        "Delete the existing row from research_admin_users first if you genuinely need to reset it.",
    );
  }
}

main().catch((err) => {
  console.error("Failed to create admin account:", err);
  process.exit(1);
});
