import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

/**
 * Hashes a plaintext password for storage. Uses Node's built-in
 * crypto.scrypt rather than bcrypt: scrypt is memory-hard (genuinely
 * resistant to GPU/ASIC brute-forcing), ships in Node's standard library
 * with zero extra dependencies, and — critically for Vercel — has no
 * native C++ binding to compile, which is exactly what makes native
 * bcrypt unreliable on serverless functions.
 *
 * Output format is "salt:hash", both hex-encoded, concatenated into one
 * string — that's what gets stored. A fresh random salt every time
 * defeats rainbow-table attacks.
 *
 * (Ported verbatim from Club House OS.)
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = (await scrypt(plaintext, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored "salt:hash" string.
 * Re-derives the hash with the same salt, then compares the two hashes
 * with crypto.timingSafeEqual — never `===`, which exits at the first
 * mismatched byte and so leaks, via timing, how many leading bytes were
 * correct.
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false; // malformed stored value — fail the login, don't crash it
  const storedHash = Buffer.from(hashHex, "hex");
  const derivedKey = (await scrypt(plaintext, salt, KEY_LENGTH)) as Buffer;
  if (derivedKey.length !== storedHash.length) return false; // timingSafeEqual throws on length mismatch
  return timingSafeEqual(derivedKey, storedHash);
}
