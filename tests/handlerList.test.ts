import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { User } from "../src/commandHandler.js";

// Mocked so the test never opens the database.
const listUsers = mock.fn(async (): Promise<User[]> => []);

mock.module("../src/lib/db/queries/userslist.js", {
    exports: { listUsers },
});

const { handlerList } = await import("../src/handlerList.js");

const originalExitCode = process.exitCode;

const userWithContact: User = {
    id: "00000000-0000-4000-8000-000000000001",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    name: "alice",
    email: "alice@example.com",
    phoneNumber: "2125550143",
    password: "fake-hash-alice",
};
const userWithoutContact: User = {
    ...userWithContact,
    id: "00000000-0000-4000-8000-000000000002",
    name: "bob",
    email: null,
    phoneNumber: null,
    password: null,
};

describe("handlerList", () => {
    let logs: string[];
    let errors: string[];

    beforeEach(() => {
        logs = [];
        errors = [];
        process.exitCode = undefined;
        listUsers.mock.resetCalls();
        mock.method(console, "log", (msg: string) => { logs.push(msg); });
        mock.method(console, "error", (msg: string) => { errors.push(msg); });
    });

    afterEach(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    it("prints each user's email and a phone number formatted as 000-000-0000", async () => {
        listUsers.mock.mockImplementation(async () => [userWithContact]);

        await handlerList();

        assert.equal(listUsers.mock.callCount(), 1);
        assert.deepEqual(logs, [
            `Name: alice, Id: ${userWithContact.id}, Email: alice@example.com, Phone#: 212-555-0143`,
        ]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });

    it("prints N/A for a user with no email or phone number", async () => {
        listUsers.mock.mockImplementation(async () => [userWithoutContact]);

        await handlerList();

        assert.deepEqual(logs, [
            `Name: bob, Id: ${userWithoutContact.id}, Email: N/A, Phone#: N/A`,
        ]);
        assert.equal(process.exitCode, undefined);
    });

    it("prints nothing when there are no users", async () => {
        listUsers.mock.mockImplementation(async () => []);

        await handlerList();

        assert.equal(listUsers.mock.callCount(), 1);
        assert.deepEqual(logs, []);
        assert.deepEqual(errors, []);
    });
});
