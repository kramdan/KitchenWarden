import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { User } from "../src/commandHandler.js";

// Mocked so the test never deletes rows from the database.
const deleteUsers = mock.fn(async (): Promise<User | undefined> => undefined);

mock.module("../src/dev/usersdelete.js", {
    exports: { deleteUsers },
});

const { handlerReset } = await import("../src/dev/handlerReset.js");

const originalExitCode = process.exitCode;

const deletedUser: User = {
    id: "00000000-0000-4000-8000-000000000001",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    name: "alice",
    email: null,
    phoneNumber: null,
    password: null,
};

describe("handlerReset", () => {
    let logs: string[];
    let errors: string[];

    beforeEach(() => {
        logs = [];
        errors = [];
        process.exitCode = undefined;
        deleteUsers.mock.resetCalls();
        mock.method(console, "log", (msg: string) => { logs.push(msg); });
        mock.method(console, "error", (msg: string) => { errors.push(msg); });
    });

    afterEach(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    it("reports that users were deleted when a row was removed", async () => {
        deleteUsers.mock.mockImplementation(async () => deletedUser);

        await handlerReset("reset");

        assert.equal(deleteUsers.mock.callCount(), 1);
        assert.deepEqual(logs, ["Users deleted"]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });

    it("reports nothing to delete when no rows were removed", async () => {
        deleteUsers.mock.mockImplementation(async () => undefined);

        await handlerReset("reset");

        assert.equal(deleteUsers.mock.callCount(), 1);
        assert.deepEqual(logs, ["Nothing to delete"]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });
});
