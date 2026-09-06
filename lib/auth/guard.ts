import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getValidSession } from "./store";
import { SESSION_COOKIE_NAME } from "./constants";

/**
 * The real access-control check for this tool. Call `requireAdminOrRedirect`
 * at the top of every protected page, and `getValidAdminSession` inside
 * every server action that does something a logged-out caller must not be
 * able to do (trigger a research run, publish to live Sheets, write to the
 * feedback log).
 *
 * Protecting only the PAGE is not sufficient — server actions are
 * independently callable regardless of whether their page was ever
 * visited. Every sensitive action must call the guard itself.
 *
 * (Pattern ported from Club House OS's lib/auth/guard.ts.)
 */
export async function requireAdminOrRedirect(): Promise<{ email: string }> {
  const session = await getValidAdminSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Same check, returns null instead of redirecting — for use inside a
 * server action, where a redirect makes no sense. Fails CLOSED: if the
 * session can't be verified for any reason (including the database being
 * unreachable), that's treated exactly like "not logged in", never as a
 * default-grant, and never allowed to crash into an error page.
 */
export async function getValidAdminSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;
  try {
    return await getValidSession(sessionToken);
  } catch {
    return null;
  }
}
