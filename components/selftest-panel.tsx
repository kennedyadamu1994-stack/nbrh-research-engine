"use client";

import { useState } from "react";
import { runStagingRoundTrip } from "@/lib/selftest";

type Result = Awaited<ReturnType<typeof runStagingRoundTrip>>;

/**
 * The build-step-1 acceptance test, run from the status page. Calls the
 * `runStagingRoundTrip` server action, which writes and reads back a
 * marker in the staging spreadsheet's `_selftest` tab.
 */
export function SelftestPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (running) return;
    setRunning(true);
    setResult(null);
    try {
      setResult(await runStagingRoundTrip());
    } catch (err) {
      setResult({
        ok: false,
        stage: "client",
        error: err instanceof Error ? err.message : "Unexpected client-side error.",
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button className="btn btn-pink" onClick={run} disabled={running}>
        {running ? "Running round trip…" : "Run staging round-trip test"}
      </button>

      {result?.ok && (
        <div className="result result-ok">
          {"✓ Round trip succeeded in " + result.ms + "ms.\n"}
          {result.tabCreated
            ? "Created the _selftest tab and wrote + read back:\n"
            : "Wrote + read back:\n"}
          {result.marker}
        </div>
      )}

      {result && !result.ok && (
        <div className="result result-err">
          {"✗ Failed at stage: " + result.stage + "\n" + result.error}
        </div>
      )}

      <p className="muted" style={{ marginTop: 10 }}>
        Touches only <code>_selftest!A1</code> in the staging spreadsheet. Never writes to the live
        sheet.
      </p>
    </div>
  );
}
