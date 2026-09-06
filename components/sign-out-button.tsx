"use client";

import { logoutAction } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="btn">
        Sign out
      </button>
    </form>
  );
}
