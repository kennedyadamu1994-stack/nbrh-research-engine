import { NextResponse } from "next/server";
import { readEnvStatus, isStep1Configured } from "@/lib/env";

/**
 * Unauthenticated liveness endpoint. Vercel and a browser sanity-check
 * can hit this to confirm the app is up and see which env vars are
 * configured — as booleans only. It never returns a secret's value and
 * never touches Sheets or the database, so it's safe to leave open.
 */
export function GET() {
  return NextResponse.json({
    ok: true,
    service: "nbrh-research-engine",
    step1Configured: isStep1Configured(),
    env: readEnvStatus().map(({ name, present, requiredForStep1 }) => ({
      name,
      present,
      requiredForStep1,
    })),
    time: new Date().toISOString(),
  });
}
