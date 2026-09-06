import { getSql } from "@/lib/db/client";

/**
 * The auth tables for this tool, created lazily on first use — same
 * pattern and rationale as Club House OS's lib/auth/store.ts.
 *
 *   research_admin_users    — one row per admin. A single fixed admin is
 *                             fine for now; the schema doesn't hard-code
 *                             that, so more admins is just more rows.
 *   research_admin_sessions — one row per active login. Deleted on logout;
 *                             stops being valid once expires_at passes
 *                             (expired rows aren't swept, just never
 *                             treated as valid — fine at this scale).
 *
 * Table names are prefixed `research_` so this database could, in
 * principle, be pointed at the same Neon project as another tool without
 * a name clash — even though Kennedy chose a separate database.
 */
let tablesReady: Promise<void> | null = null;

function ensureTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await getSql()`
        CREATE TABLE IF NOT EXISTS research_admin_users (
          email TEXT PRIMARY KEY,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await getSql()`
        CREATE TABLE IF NOT EXISTS research_admin_sessions (
          session_token TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at TIMESTAMPTZ NOT NULL
        );
      `;
    })();
  }
  return tablesReady;
}

export async function getAdminUser(
  email: string,
): Promise<{ email: string; password_hash: string } | null> {
  await ensureTables();
  const rows = (await getSql()`
    SELECT email, password_hash FROM research_admin_users
    WHERE email = ${email.trim().toLowerCase()};
  `) as { email: string; password_hash: string }[];
  return rows[0] ?? null;
}

/**
 * Creates the admin account. Refuses to overwrite an existing row
 * (ON CONFLICT DO NOTHING) rather than upserting — this is the
 * account-creation path, not a password-change path. Returns whether it
 * actually created a row.
 */
export async function createAdminUser(
  email: string,
  passwordHash: string,
): Promise<{ created: boolean }> {
  await ensureTables();
  const rows = (await getSql()`
    INSERT INTO research_admin_users (email, password_hash)
    VALUES (${email.trim().toLowerCase()}, ${passwordHash})
    ON CONFLICT (email) DO NOTHING
    RETURNING email;
  `) as { email: string }[];
  return { created: rows.length > 0 };
}

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export async function createSession(email: string, sessionToken: string): Promise<void> {
  await ensureTables();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await getSql()`
    INSERT INTO research_admin_sessions (session_token, email, expires_at)
    VALUES (${sessionToken}, ${email.trim().toLowerCase()}, ${expiresAt.toISOString()});
  `;
}

/**
 * Returns the session's email if the token exists AND hasn't expired,
 * null otherwise. Missing / unknown / expired all fail identically so
 * nothing about the failure reason leaks.
 */
export async function getValidSession(
  sessionToken: string,
): Promise<{ email: string } | null> {
  if (!sessionToken) return null;
  await ensureTables();
  const rows = (await getSql()`
    SELECT email FROM research_admin_sessions
    WHERE session_token = ${sessionToken} AND expires_at > now();
  `) as { email: string }[];
  return rows[0] ?? null;
}

export async function deleteSession(sessionToken: string): Promise<void> {
  await ensureTables();
  await getSql()`DELETE FROM research_admin_sessions WHERE session_token = ${sessionToken};`;
}
