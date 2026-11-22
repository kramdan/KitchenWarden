import { randomBytes, timingSafeEqual } from "node:crypto";

// Anonymous forms (login, register) use this cookie. Each form repeats the value in a hidden
// field, and the server checks that the two match. Signed-in forms use the session's token.
export const CSRF_COOKIE = "kw_csrf";

export function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

// Constant-time comparison. Missing or empty values never match.
export function csrfTokensMatch(expected: unknown, submitted: unknown): boolean {
  if (typeof expected !== "string" || typeof submitted !== "string") {
    return false;
  }
  if (expected === "" || submitted === "") {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(submitted);
  return a.length === b.length && timingSafeEqual(a, b);
}
