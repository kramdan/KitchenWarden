import { after, before, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Dependencies } from "../src/dependencies.js";

const CSRF_TOKEN = "dev-reset-csrf-token";

// Session stub. No session cookie is sent in these tests, so loadSession is never asked for a user.
const loadSession = mock.fn(async (_token: string) => undefined);
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

// Dev reset stub. The route must call this once per confirmed POST and never on GET.
const handlerReset = mock.fn(async (_cmdName: string) => true);

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
mock.module("../src/dev/handlerReset.js", { exports: { handlerReset } });

const { createApp } = await import("../src/app.js");
const { initDependencies } = await import("../src/dependencies.js");

const stub = {
  appOrigin: "http://localhost:3000",
  port: 0,
  databasePath: "test",
  maxRequestBodyBytes: 32768,
  maxUploadBytes: 1048576,
  trustedProxyHops: 0,
  downloadSigningKey: Buffer.alloc(32),
  devTools: false,
  db: {},
} as unknown as Dependencies;

const VALID_ENV = {
  HOST: "127.0.0.1",
  DATABASE_URL: "postgres://test-user:test-password@localhost:5432/kitchenwarden_test",
  DOWNLOAD_SIGNING_KEY: "ab".repeat(32),
};

describe("initDependencies devTools", () => {
  // requireENV reads process.env, not the env argument, so the required keys are set on process.env here
  // and the previous values are restored afterwards.
  let savedHost: string | undefined;
  let savedDatabaseUrl: string | undefined;
  let savedSigningKey: string | undefined;

  before(() => {
    savedHost = process.env.HOST;
    savedDatabaseUrl = process.env.DATABASE_URL;
    savedSigningKey = process.env.DOWNLOAD_SIGNING_KEY;
    process.env.HOST = VALID_ENV.HOST;
    process.env.DATABASE_URL = VALID_ENV.DATABASE_URL;
    process.env.DOWNLOAD_SIGNING_KEY = VALID_ENV.DOWNLOAD_SIGNING_KEY;
  });

  after(() => {
    if (savedHost === undefined) {
      delete process.env.HOST;
    } else {
      process.env.HOST = savedHost;
    }
    if (savedDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = savedDatabaseUrl;
    }
    if (savedSigningKey === undefined) {
      delete process.env.DOWNLOAD_SIGNING_KEY;
    } else {
      process.env.DOWNLOAD_SIGNING_KEY = savedSigningKey;
    }
  });

  it("enables devTools when DEV_TOOLS is exactly 'true'", () => {
    const deps = initDependencies({ ...VALID_ENV, DEV_TOOLS: "true" });
    assert.equal(deps.devTools, true);
  });

  it("disables devTools when DEV_TOOLS is unset", () => {
    const deps = initDependencies({ ...VALID_ENV });
    assert.equal(deps.devTools, false);
  });

  it("disables devTools for DEV_TOOLS values '1' and 'TRUE'", () => {
    assert.equal(initDependencies({ ...VALID_ENV, DEV_TOOLS: "1" }).devTools, false);
    assert.equal(initDependencies({ ...VALID_ENV, DEV_TOOLS: "TRUE" }).devTools, false);
  });
});

describe("dev routes", () => {
  let server: Server;
  let base = "";

  // Starts a server for the given devTools setting. Each describe block below owns one server.
  async function listen(devTools: boolean): Promise<void> {
    server = createApp({ ...stub, devTools }).listen(0, "127.0.0.1");
    await once(server, "listening");
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  async function close(): Promise<void> {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  beforeEach(() => {
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
      handlerReset,
    ]) {
      fn.mock.resetCalls();
    }
  });

  function get(path: string): Promise<Response> {
    return fetch(`${base}${path}`, { redirect: "manual" });
  }

  // The reset form is anonymous, so the CSRF cookie is set and the form repeats the token in csrf_token.
  function postReset(fields: Record<string, string>, cookie = `kw_csrf=${CSRF_TOKEN}`): Promise<Response> {
    return fetch(`${base}/reset`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    });
  }

  describe("with devTools disabled", () => {
    before(() => listen(false));
    after(close);

    it("returns 404 for GET /health", async () => {
      const res = await get("/health");
      await res.text();
      assert.equal(res.status, 404);
    });

    it("returns 404 for GET /reset", async () => {
      const res = await get("/reset");
      await res.text();
      assert.equal(res.status, 404);
    });
  });

  describe("with devTools enabled", () => {
    before(() => listen(true));
    after(close);

    it("returns 200 JSON { ok: true, app: 'kitchen-warden' } for GET /health", async () => {
      const res = await get("/health");
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") ?? "", /application\/json/);
      assert.deepEqual(body, { ok: true, app: "kitchen-warden" });
    });

    it("returns the reset form posting to /reset without calling handlerReset", async () => {
      const res = await get("/reset");
      const html = await res.text();
      assert.equal(res.status, 200);
      assert.ok(html.includes('action="/reset"'));
      assert.equal(handlerReset.mock.callCount(), 0);
    });

    it("rejects a POST /reset with a mismatched csrf_token with 403 without calling handlerReset", async () => {
      const res = await postReset({ csrf_token: "wrong-csrf-token" });
      await res.text();
      assert.equal(res.status, 403);
      assert.equal(handlerReset.mock.callCount(), 0);
    });

    it("runs the reset once and shows 'All users have been deleted.' when users were deleted", async () => {
      const res = await postReset({ csrf_token: CSRF_TOKEN });
      const html = await res.text();
      assert.equal(res.status, 200);
      assert.equal(handlerReset.mock.callCount(), 1);
      assert.deepEqual(handlerReset.mock.calls[0].arguments, ["reset"]);
      assert.ok(html.includes("All users have been deleted."));
    });

    it("shows 'There were no users to delete.' when handlerReset deletes nothing", async () => {
      handlerReset.mock.mockImplementationOnce(async () => false);
      const res = await postReset({ csrf_token: CSRF_TOKEN });
      const html = await res.text();
      assert.equal(res.status, 200);
      assert.equal(handlerReset.mock.callCount(), 1);
      assert.ok(html.includes("There were no users to delete."));
    });
  });
});
