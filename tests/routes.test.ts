import { beforeEach, after, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Dependencies } from "../src/dependencies.js";
import { clearFailures } from "../src/lib/auth/rateLimit.js";

// The server listens on 127.0.0.1 so the client address, and so the rate-limit key, is known.
const CLIENT_IP_KEY = "ip:127.0.0.1";
const SESSION_TOKEN = "signed-in-session-token";
const CSRF_TOKEN = "anonymous-csrf-token";
const SIGNED_IN_USER = {
  id: "11111111-1111-4111-8111-111111111111",
  firstName: "ada",
  lastName: "lovelace",
  email: "ada@example.test",
  phoneNumber: null,
  password: "stored-hash-placeholder",
};

// Session stub. Only SESSION_TOKEN resolves to a signed-in user.
const loadSession = mock.fn(async (token: string) =>
  token === SESSION_TOKEN ? { user: SIGNED_IN_USER, csrfToken: "session-csrf-token" } : undefined,
);
const createSession = mock.fn(async () => "new-session-token");
const destroySession = mock.fn(async () => {});
const destroyUserSessions = mock.fn(async () => {});
const purgeExpiredSessions = mock.fn(async () => {});

// Account service stub. The routes check AccountError with instanceof, so the stub exports this class.
class AccountError extends Error {}
const authenticate = mock.fn(async (_email: string, _password: string) => undefined);
const registerAccount = mock.fn(async (_input: unknown) => {
  throw new Error("registerAccount should not be reached in this test");
});
const changeEmail = mock.fn(async () => undefined);
const changePhone = mock.fn(async () => undefined);
const changePassword = mock.fn(async () => undefined);
const deleteAccount = mock.fn(async () => undefined);

mock.module("../src/logger.js", { exports: { logEvent: () => {} } });
mock.module("../src/lib/db/index.js", {
  exports: { db: {}, openDatabase: () => ({}), closeDb: async () => {} },
});
mock.module("../src/lib/auth/session.js", {
  exports: {
    SESSION_COOKIE: "kw_session",
    ABSOLUTE_TIMEOUT_MS: 24 * 60 * 60 * 1000,
    loadSession,
    createSession,
    destroySession,
    destroyUserSessions,
    purgeExpiredSessions,
  },
});
mock.module("../src/lib/services/accountServices.js", {
  exports: {
    AccountError,
    authenticate,
    registerAccount,
    changeEmail,
    changePhone,
    changePassword,
    deleteAccount,
  },
});

const { createApp } = await import("../src/app.js");

const stub = {
  appOrigin: "http://localhost:3000",
  port: 0,
  databasePath: "test",
  maxRequestBodyBytes: 32768,
  maxUploadBytes: 1048576,
  trustedProxyHops: 0,
  downloadSigningKey: Buffer.alloc(32),
  db: {},
} as unknown as Dependencies;

describe("web routes", () => {
  let server: Server;
  let base = "";

  before(async () => {
    server = createApp(stub).listen(0, "127.0.0.1");
    await once(server, "listening");
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  beforeEach(() => {
    clearFailures(CLIENT_IP_KEY);
    for (const fn of [
      loadSession,
      createSession,
      destroySession,
      destroyUserSessions,
      purgeExpiredSessions,
      authenticate,
      registerAccount,
      changeEmail,
      changePhone,
      changePassword,
      deleteAccount,
    ]) {
      fn.mock.resetCalls();
    }
  });

  // Anonymous form posts carry the CSRF cookie, and the form repeats it in csrf_token.
  function postForm(path: string, fields: Record<string, string>, cookie = `kw_csrf=${CSRF_TOKEN}`): Promise<Response> {
    return fetch(`${base}${path}`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    });
  }

  function get(path: string, cookie?: string): Promise<Response> {
    return fetch(`${base}${path}`, { redirect: "manual", headers: cookie ? { cookie } : {} });
  }

  it("rejects a login POST without a CSRF token with 403", async () => {
    const res = await postForm("/auth/login", { email: "ada@example.test", password: "wrong-password-value" });
    await res.text();
    assert.equal(res.status, 403);
    assert.equal(authenticate.mock.callCount(), 0);
  });

  it("returns 401 with 'Email or password incorrect' for an unknown email", async () => {
    const res = await postForm("/auth/login", {
      csrf_token: CSRF_TOKEN,
      email: "nobody@example.test",
      password: "wrong-password-value",
    });
    const html = await res.text();
    assert.equal(res.status, 401);
    assert.ok(html.includes("Email or password incorrect"));
  });

  it("returns 429 on the sixth failed login for the same email", async () => {
    const fields = { csrf_token: CSRF_TOKEN, email: "locked@example.test", password: "wrong-password-value" };
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const res = await postForm("/auth/login", fields);
      await res.text();
      assert.equal(res.status, 401, `failed login attempt ${attempt}`);
    }
    const res = await postForm("/auth/login", fields);
    await res.text();
    assert.equal(res.status, 429);
  });

  it("rejects a registration with mismatched passwords with 400 and 'Passwords do not match.'", async () => {
    const res = await postForm("/auth/register", {
      csrf_token: CSRF_TOKEN,
      first_name: "ada",
      last_name: "lovelace",
      email: "ada@example.test",
      password: "correct horse battery",
      confirm_password: "different horse battery",
    });
    const html = await res.text();
    assert.equal(res.status, 400);
    assert.ok(html.includes("Passwords do not match."));
    assert.equal(registerAccount.mock.callCount(), 0);
  });

  it("redirects the home page to /account for a signed-in user", async () => {
    const res = await get("/", `kw_session=${SESSION_TOKEN}`);
    await res.text();
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/account");
  });

  it("redirects the login page to /account for a signed-in user", async () => {
    const res = await get("/auth/login", `kw_session=${SESSION_TOKEN}`);
    await res.text();
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/account");
  });

  it("redirects /account to /auth/login without a session", async () => {
    const res = await get("/account");
    await res.text();
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/auth/login");
  });

  it("sends Cache-Control no-store for /auth and /account responses", async () => {
    const login = await get("/auth/login");
    await login.text();
    assert.equal(login.headers.get("cache-control"), "no-store");

    const account = await get("/account");
    await account.text();
    assert.equal(account.headers.get("cache-control"), "no-store");
  });

  it("sends Cache-Control no-cache for the home page", async () => {
    const res = await get("/");
    await res.text();
    assert.equal(res.headers.get("cache-control"), "no-cache");
  });

  it("does not serve source files from src, so /layout.ts returns 404", async () => {
    const res = await get("/layout.ts");
    await res.text();
    assert.equal(res.status, 404);
  });

  it("serves files under /assets", async () => {
    const res = await get("/assets/aesthetics/confirm-password.js");
    await res.text();
    assert.equal(res.status, 200);
  });
});
