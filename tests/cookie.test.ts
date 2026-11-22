import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { Response } from "express";

// cookie.ts imports session.ts, which imports the database. Stub it so no connection opens.
mock.module("../src/lib/db/index.js", { exports: { db: {} } });

const { setCsrfCookie, setSessionCookie } = await import("../src/lib/auth/cookie.js");
const { CSRF_COOKIE } = await import("../src/lib/auth/csrf.js");
const { SESSION_COOKIE } = await import("../src/lib/auth/session.js");

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function fakeResponse(): { res: Response; cookies: CookieCall[]; cleared: CookieCall[] } {
  const cookies: CookieCall[] = [];
  const cleared: CookieCall[] = [];
  const res = {
    cookie(name: string, value: string, options: Record<string, unknown>) {
      cookies.push({ name, value, options });
    },
    clearCookie(name: string, options: Record<string, unknown>) {
      cleared.push({ name, value: "", options });
    },
  };
  return { res: res as unknown as Response, cookies, cleared };
}

describe("auth cookies", () => {
  it("sets the session cookie as HttpOnly, strict SameSite, Secure, path /, with a 24 hour max age", () => {
    const { res, cookies } = fakeResponse();
    setSessionCookie(res, "session-token-value");
    assert.equal(cookies.length, 1);
    assert.equal(cookies[0].name, SESSION_COOKIE);
    assert.equal(cookies[0].value, "session-token-value");
    assert.deepEqual(cookies[0].options, {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
      maxAge: TWENTY_FOUR_HOURS_MS,
    });
  });

  it("sets the CSRF cookie as HttpOnly, strict SameSite, Secure, path /, with a 24 hour max age", () => {
    const { res, cookies } = fakeResponse();
    setCsrfCookie(res, "csrf-token-value");
    assert.equal(cookies.length, 1);
    assert.equal(cookies[0].name, CSRF_COOKIE);
    assert.equal(cookies[0].value, "csrf-token-value");
    assert.deepEqual(cookies[0].options, {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
      maxAge: TWENTY_FOUR_HOURS_MS,
    });
  });
});
