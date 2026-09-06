import { randomAlphanumeric } from "./random-string";

/**
 * Generates an admin session token. 32 characters of a 62-character
 * alphabet is well over 190 bits of entropy — infeasible to guess or
 * brute-force. Shares its generation logic with everything else that
 * needs a credential-grade random string via randomAlphanumeric.
 *
 * (Ported from Club House OS.)
 */
export function generateSessionToken(): string {
  return randomAlphanumeric(32);
}
