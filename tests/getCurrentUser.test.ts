import { beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { User } from "../src/commandHandler.js";

// Mocked so the test never reads kw.config.json.
const readConfig = mock.fn((): { currentUserName: string } => ({ currentUserName: "" }));

// Mocked so the test never connects to the database. The chain mirrors
// db.select().from(users).where(...) in getCurrentUser.
const where = mock.fn(async (_condition: unknown): Promise<User[]> => []);
const from = mock.fn((_table: unknown) => ({ where }));
const select = mock.fn(() => ({ from }));

mock.module("../src/config.js", {
    exports: { readConfig },
});
mock.module("../src/lib/db/index.js", {
    exports: { db: { select } },
});

const { getCurrentUser } = await import("../src/lib/db/queries/getCurrentUser.js");

const dialect = new PgDialect();

// Runs getCurrentUser for the given current user name and returns the bound
// parameters of the predicate passed to where(...).
async function boundParamsFor(currentUserName: string): Promise<unknown[]> {
    readConfig.mock.mockImplementation(() => ({ currentUserName }));
    await getCurrentUser();
    const condition = where.mock.calls[0].arguments[0] as SQL;
    return dialect.sqlToQuery(condition).params;
}

const alice: User = {
    id: "00000000-0000-4000-8000-000000000001",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    name: "alice",
    email: null,
    phoneNumber: null,
    password: null,
};

describe("getCurrentUser", () => {
    beforeEach(() => {
        readConfig.mock.resetCalls();
        select.mock.resetCalls();
        from.mock.resetCalls();
        where.mock.resetCalls();
    });

    it("returns undefined without querying the database when no current user is set", async () => {
        readConfig.mock.mockImplementation(() => ({ currentUserName: "" }));

        const result = await getCurrentUser();

        assert.equal(result, undefined);
        assert.equal(select.mock.callCount(), 0);
    });

    it("returns the row the query finds for the current user name", async () => {
        readConfig.mock.mockImplementation(() => ({ currentUserName: "alice" }));
        where.mock.mockImplementation(async () => [alice]);

        const result = await getCurrentUser();

        assert.equal(select.mock.callCount(), 1);
        assert.deepEqual(result, alice);
    });

    it("escapes % in the current user name so it matches literally", async () => {
        assert.deepEqual(await boundParamsFor("a%b"), ["a\\%b"]);
    });

    it("escapes _ in the current user name so it matches literally", async () => {
        assert.deepEqual(await boundParamsFor("a_b"), ["a\\_b"]);
    });

    it("escapes a backslash in the current user name so it matches literally", async () => {
        assert.deepEqual(await boundParamsFor("a\\b"), ["a\\\\b"]);
    });

    it("passes a plain current user name through unchanged", async () => {
        assert.deepEqual(await boundParamsFor("alice"), ["alice"]);
    });
});
