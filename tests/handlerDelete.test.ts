import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { User } from "../src/commandHandler.js";

// Mocked so the test never clears the local CLI config (kw.config.json).
const clearUser = mock.fn((): void => undefined);

// Mocked so the test never deletes rows from the database.
const deleteUsers = mock.fn(async (_user: User): Promise<void> => undefined);

// Mocked so the test never reads from stdin. Only promptSecret is exported by its module.
const promptSecret = mock.fn(async (_question: string): Promise<string> => "");

// Mocked so the test never runs argon2. The stored hash below is a fake placeholder.
const verifyPassword = mock.fn(
    async (_password: string, _passwordHash: string): Promise<boolean> => false,
);

mock.module("../src/config.js", {
    exports: { clearUser },
});
mock.module("../src/handlerPassword.js", {
    exports: { verifyPassword },
});
mock.module("../src/lib/prompt.js", {
    exports: { promptSecret },
});
mock.module("../src/lib/db/queries/userdelete.js", {
    exports: { deleteUsers },
});

const { handlerDelete } = await import("../src/handlerDelete.js");

const originalExitCode = process.exitCode;

const storedHash = "$argon2id$v=19$m=19456,t=2,p=1$ZmFrZXNhbHQ$ZmFrZWhhc2g";

const userWithoutPassword: User = {
    id: "00000000-0000-4000-8000-000000000001",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    name: "alice",
    email: null,
    phoneNumber: null,
    password: null,
};

const userWithPassword: User = {
    ...userWithoutPassword,
    password: storedHash,
};

describe("handlerDelete", () => {
    let logs: string[];
    let errors: string[];

    beforeEach(() => {
        logs = [];
        errors = [];
        process.exitCode = undefined;
        clearUser.mock.resetCalls();
        deleteUsers.mock.resetCalls();
        promptSecret.mock.resetCalls();
        verifyPassword.mock.resetCalls();
        mock.method(console, "log", (msg: string) => { logs.push(msg); });
        mock.method(console, "error", (msg: string) => { errors.push(msg); });
    });

    afterEach(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    it("refuses to delete a user who has no password, without prompting or deleting", async () => {
        await handlerDelete("delete", userWithoutPassword);

        assert.equal(errors.length, 1);
        assert.deepEqual(logs, []);
        assert.equal(promptSecret.mock.callCount(), 0);
        assert.equal(verifyPassword.mock.callCount(), 0);
        assert.equal(deleteUsers.mock.callCount(), 0);
        assert.equal(clearUser.mock.callCount(), 0);
        assert.equal(process.exitCode, 1);
    });

    it("prompts for the current password and verifies it against the stored hash", async () => {
        promptSecret.mock.mockImplementation(async () => "example-passphrase-1");
        verifyPassword.mock.mockImplementation(async () => true);

        await handlerDelete("delete", userWithPassword);

        assert.equal(promptSecret.mock.callCount(), 1);
        assert.deepEqual(promptSecret.mock.calls[0].arguments, ["Input current password: "]);
        assert.deepEqual(verifyPassword.mock.calls[0].arguments, [
            "example-passphrase-1",
            storedHash,
        ]);
    });

    it("rejects an incorrect current password without deleting or clearing the config", async () => {
        promptSecret.mock.mockImplementation(async () => "wrong-passphrase-0000");
        verifyPassword.mock.mockImplementation(async () => false);

        await handlerDelete("delete", userWithPassword);

        assert.equal(verifyPassword.mock.callCount(), 1);
        assert.equal(deleteUsers.mock.callCount(), 0);
        assert.equal(clearUser.mock.callCount(), 0);
        assert.deepEqual(errors, ["Current password is incorrect"]);
        assert.deepEqual(logs, []);
        assert.equal(process.exitCode, 1);
    });

    it("deletes the user and clears the config when the current password is correct", async () => {
        promptSecret.mock.mockImplementation(async () => "example-passphrase-1");
        verifyPassword.mock.mockImplementation(async () => true);

        await handlerDelete("delete", userWithPassword);

        assert.equal(deleteUsers.mock.callCount(), 1);
        assert.deepEqual(deleteUsers.mock.calls[0].arguments, [userWithPassword]);
        assert.equal(clearUser.mock.callCount(), 1);
        assert.deepEqual(logs, ['User "alice" has been deleted.']);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });
});
