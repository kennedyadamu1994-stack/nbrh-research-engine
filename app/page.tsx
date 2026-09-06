import { requireAdminOrRedirect } from "@/lib/auth/guard";
import { readEnvStatus } from "@/lib/env";
import { checkDbConnection } from "@/lib/db/client";
import { SelftestPanel } from "@/components/selftest-panel";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * Build-step-1 status page. Protected. Shows:
 *   - which environment variables are configured (presence only)
 *   - whether the Neon database is reachable
 *   - a button to run the staging read/write round trip
 *
 * This is the whole of step 1's UI. The review dashboard is a later step.
 */
export default async function StatusPage() {
  await requireAdminOrRedirect();

  const env = readEnvStatus();
  const db = await checkDbConnection();

  return (
    <main className="page">
      <div className="topbar">
        <p className="eyebrow">The NBRH · Research Engine</p>
        <SignOutButton />
      </div>
      <h1>Build step 1 — status</h1>
      <p className="muted">
        Scaffold + Sheets connection. This step is done when the round-trip test below passes on the
        deployed app.
      </p>

      <div className="card">
        <h2>Environment</h2>
        <ul className="status-list">
          {env.map((v) => (
            <li key={v.name} className="status-row">
              <code>{v.name}</code>
              {v.present ? (
                <span className="pill pill-ok">set</span>
              ) : v.requiredForStep1 ? (
                <span className="pill pill-missing">missing</span>
              ) : (
                <span className="pill pill-optional">later step</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Database (Neon)</h2>
        {db.ok ? (
          <div className="result result-ok">✓ Connected. Auth tables are ready.</div>
        ) : (
          <div className="result result-err">✗ Could not connect.{"\n" + db.error}</div>
        )}
      </div>

      <div className="card">
        <h2>Staging spreadsheet round trip</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Writes a unique marker to <code>_selftest!A1</code> in the staging spreadsheet, reads it
          back, and checks it matches.
        </p>
        <SelftestPanel />
      </div>
    </main>
  );
}
