"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminUser, createSession, deleteSession } from "./store";
import { verifyPassword } from "./password";
import { generateSessionToken } from "./session-token";
import { SESSION_COOKIE_NAME } from "./constants";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days, matches store.ts

/**
 * Attempts an admin login. Returns the SAME generic error whether the
 * email doesn't exist or the password is wrong — a distinct "no account
 * with that email" message would let an attacker enumerate admin emails.
 *
 * Sets the session cookie httpOnly (client-side JS can never read its
 * value), secure (never sent over plain HTTP), sameSite "lax" (the real
 * CSRF mitigation — not sent on cross-site POSTs, which is what every
 * dangerous action this protects uses).
 *
 * Never throws across the action boundary — a thrown error gets redacted
 * to a useless generic message in production. The catch branch returns a
 * DIFFERENT message from the auth-failure one, because "the database is
 * unreachable" and "your password is wrong" must not look identical to
 * whoever's trying to sign in.
 *
 * (Ported from Club House OS's lib/auth/actions.ts.)
 */
export async function loginAction(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const genericError = "Incorrect email or password.";
  if (!email || !password) return { ok: false, error: genericError };

  try {
    const user = await getAdminUser(email);
    if (!user) return { ok: false, error: genericError };

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return { ok: false, error: genericError };

    const sessionToken = generateSessionToken();
    await createSession(user.email, sessionToken);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Couldn't sign in: ${err.message}`
          : "Couldn't sign in, please try again.",
    };
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    await deleteSession(sessionToken);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
