import { beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

type DbCall = { op: string; args: unknown[] };
const dbCalls: DbCall[] = [];
// Each select() takes the next queued result set. An empty queue returns no rows.
const selectResults: unknown[][] = [];

function record(op: string, args: unknown[]): void {
  dbCalls.push({ op, args });
}

// Stands in for the drizzle client. It records each call and the arguments it was given.
const fakeDb = {
  select(...args: unknown[]) {
    record("select", args);
    return {
      from(table: unknown) {
        record("from", [table]);
        return {
          where(condition: unknown) {
            record("where", [condition]);
            return Promise.resolve(selectResults.shift() ?? []);
          },
        };
      },
    };
  },
  insert(table: unknown) {
    record("insert", [table]);
    return {
      values(row: unknown) {
        record("values", [row]);
        return Promise.resolve([]);
      },
    };
  },
  update(table: unknown) {
    record("update", [table]);
    return {
      set(values: unknown) {
        record("set", [values]);
        return {
          where(condition: unknown) {
            record("where", [condition]);
            return Promise.resolve([]);
          },
        };
      },
    };
  },
  delete(table: unknown) {
    record("delete", [table]);
    return {
      where(condition: unknown) {
        record("where", [condition]);
        return Promise.resolve([]);
      },
    };
  },
};

mock.module("../src/lib/db/index.js", { exports: { db: fakeDb } });

const { createSession, destroySession, destroyUserSessions, hashToken, loadSession, purgeExpiredSessions } =
  await import("../src/lib/auth/session.js");
const { sessions } = await import("../src/lib/db/schema.js");

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const NOW = new Date("2026-11-22T12:00:00.000Z");

const USER = {
  id: "user-1",
  firstName: "ada",
  lastName: "lovelace",
  email: "ada@example.test",
  phoneNumber: null,
  password: "stored-hash-placeholder",
  createdAt: NOW,
  updatedAt: NOW,
};

type SessionRow = {
  tokenHash: string;
  userId: string;
  csrfToken: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  expired: boolean;
};

function sessionRow(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    tokenHash: hashToken("session-token"),
    userId: USER.id,
    csrfToken: "csrf-value",
    createdAt: new Date(NOW.getTime() - HOUR_MS),
    updatedAt: new Date(NOW.getTime() - HOUR_MS),
    expiresAt: new Date(NOW.getTime() + 10 * MINUTE_MS),
    expired: false,
    ...overrides,
  };
}

function callsFor(op: string): DbCall[] {
  return dbCalls.filter((call) => call.op === op);
}

function firstArg<T>(op: string): T {
  const [call] = callsFor(op);
  assert.ok(call, `expected a db ${op} call`);
  return call.args[0] as T;
}

// Renders the WHERE clause of the first where() call to SQL text and bound parameters.
function whereQuery(): { sql: string; params: unknown[] } {
  return new PgDialect().sqlToQuery(firstArg<SQL>("where"));
}

describe("session tokens", () => {
  it("hashes the same token to the same value", () => {
    assert.equal(hashToken("token-a"), hashToken("token-a"));
  });

  it("hashes different tokens to different values", () => {
    assert.notEqual(hashToken("token-a"), hashToken("token-b"));
  });

  it("does not include the raw token in its hash", () => {
    const token = "raw-session-token-value";
    assert.ok(!hashToken(token).includes(token));
  });
});

describe("session storage", () => {
  beforeEach(() => {
    dbCalls.length = 0;
    selectResults.length = 0;
  });

  it("createSession stores expires_at 60 minutes after now", async () => {
    await createSession(USER.id, NOW);
    const row = firstArg<{ expiresAt: Date }>("values");
    assert.equal(row.expiresAt.getTime(), NOW.getTime() + HOUR_MS);
  });

  it("loadSession rejects a missing session row without updating anything", async () => {
    selectResults.push([]);
    assert.equal(await loadSession("unknown-token", NOW), undefined);
    assert.equal(callsFor("update").length, 0);
  });

  it("loadSession rejects a session that is already flagged as expired", async () => {
    selectResults.push([sessionRow({ expired: true })]);
    assert.equal(await loadSession("session-token", NOW), undefined);
  });

  it("loadSession rejects a session past its expires_at", async () => {
    selectResults.push([sessionRow({ expiresAt: new Date(NOW.getTime() - 1) })]);
    assert.equal(await loadSession("session-token", NOW), undefined);
  });

  it("loadSession refreshes expires_at but caps it at createdAt plus 24 hours", async () => {
    const createdAt = new Date(NOW.getTime() - 23.5 * HOUR_MS);
    selectResults.push([sessionRow({ createdAt })], [USER]);
    await loadSession("session-token", NOW);
    const refreshed = firstArg<{ expiresAt: Date }>("set");
    assert.equal(refreshed.expiresAt.getTime(), NOW.getTime() + 30 * MINUTE_MS);
  });

  it("loadSession returns the user and CSRF token for a live session", async () => {
    const row = sessionRow();
    selectResults.push([row], [USER]);
    const loaded = await loadSession("session-token", NOW);
    assert.deepEqual(loaded, { user: USER, csrfToken: row.csrfToken });
  });

  it("destroySession deletes the session row by the hash of its token", async () => {
    await destroySession("raw-session-token");
    assert.equal(firstArg("delete"), sessions);
    const { params } = whereQuery();
    assert.ok(params.includes(hashToken("raw-session-token")));
    assert.ok(!params.includes("raw-session-token"));
  });

  it("destroyUserSessions deletes the sessions of the given user", async () => {
    await destroyUserSessions(USER.id);
    assert.equal(firstArg("delete"), sessions);
    assert.ok(whereQuery().params.includes(USER.id));
  });

  it("purgeExpiredSessions deletes flagged sessions and sessions past expires_at", async () => {
    await purgeExpiredSessions(NOW);
    assert.equal(firstArg("delete"), sessions);
    const { sql } = whereQuery();
    assert.match(sql, /"expired"/);
    assert.match(sql, /"expires_at" <=/);
  });
});
