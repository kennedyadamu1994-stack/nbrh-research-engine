import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { requireEnv } from "@/lib/env";

/**
 * The Neon Postgres handle, lazily constructed — NOT at module load.
 * Mirrors the pattern in Club House OS's lib/auth/store.ts: pages that
 * import an auth module can get statically analysed at build time, which
 * executes top-level code in an environment that may have no real
 * POSTGRES_URL. Deferring construction to the first real query avoids
 * that regardless of which pages end up importing this.
 *
 * This database is separate from the Club House OS one (Kennedy's choice
 * — "separate database, same style"). It holds only the auth tables for
 * this tool.
 */
let sqlClient: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    sqlClient = neon(requireEnv("POSTGRES_URL"));
  }
  return sqlClient;
}

/**
 * Best-effort connectivity check for the status page. Returns a plain
 * ok/error shape and never throws — a failure here is information to
 * display, not a crash.
 */
export async function checkDbConnection(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getSql()`SELECT 1;`;
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown database error.",
    };
  }
}
