import type { Response } from "express";
import { CSRF_COOKIE } from "./csrf.js";
import { ABSOLUTE_TIMEOUT_MS, SESSION_COOKIE } from "./session.js";

// Secure is always set. Browsers accept Secure cookies on localhost and 127.0.0.1, but this
// must be checked in each browser used before relying on it.
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "strict",
  secure: true,
  path: "/",
} as const;

// Max-Age matches the absolute session lifetime, so the browser drops the cookie when the
// server would reject the session anyway.
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, { ...COOKIE_BASE, maxAge: ABSOLUTE_TIMEOUT_MS });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, COOKIE_BASE);
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, { ...COOKIE_BASE, maxAge: ABSOLUTE_TIMEOUT_MS });
}
