"use client";

import { useState } from "react";
import { loginAction } from "@/lib/auth/actions";

/**
 * Email + password sign-in. Behaviour ported from Club House OS's
 * components/login-form.tsx — on success, a hard navigation (not
 * router.push) so the very next request definitely carries the session
 * cookie the server action just set.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    const result = await loginAction(email, password);
    if (result.ok) {
      window.location.href = "/";
      return;
    }
    setError(result.error);
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="field">
        <label htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn btn-pink" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
