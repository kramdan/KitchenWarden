import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { User } from "../src/commandHandler.js";

// Mocked so the test never opens the database. argon2 is not mocked: the stored
// hash is checked with the real verifyPassword.
const setPassword = mock.fn(async (_user: User, _passwordHash: string): Promise<void> => undefined);

// Mocked so the test never reads from stdin. Only promptSecret is exported by its module.
const promptSecret = mock.fn(async (_question: string): Promise<string> => "");

// Answers promptSecret calls in order: the new password first, then the current password.
function answerPrompts(...answers: string[]): void {
    promptSecret.mock.mockImplementation(async () => answers.shift() ?? "");
}

mock.module("../src/lib/db/queries/setPassword.js", {
    exports: { setPassword },
});

mock.module("../src/lib/prompt.js", {
    exports: { promptSecret },
});

const { handlerPassword, hashPassword, verifyPassword } = await import("../src/handlerPassword.js");

const originalExitCode = process.exitCode;

const userWithoutPassword: User = {
    id: "00000000-0000-4000-8000-000000000001",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    name: "alice",
    email: null,
    phoneNumber: null,
    password: null,
};

const LENGTH_ERROR = "Password does not meet the length requirements: 12-128 char length";

const oldPassword = "old-passphrase-2025";
const newPassword = "new-passphrase-2026";
const userWithPassword: User = {
    ...userWithoutPassword,
    password: await hashPassword(oldPassword),
};

describe("handlerPassword", () => {
    let logs: string[];
    let errors: string[];

    beforeEach(() => {
        logs = [];
        errors = [];
        process.exitCode = undefined;
        setPassword.mock.resetCalls();
        promptSecret.mock.resetCalls();
        mock.method(console, "log", (msg: string) => { logs.push(msg); });
        mock.method(console, "error", (msg: string) => { errors.push(msg); });
    });

    afterEach(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    it("rejects a password shorter than 12 characters", async () => {
        answerPrompts("a".repeat(11));

        await handlerPassword("password", userWithoutPassword);

        assert.equal(promptSecret.mock.callCount(), 1);
        assert.equal(setPassword.mock.callCount(), 0);
        assert.deepEqual(errors, [LENGTH_ERROR]);
        assert.equal(process.exitCode, 1);
    });

    it("rejects a password longer than 128 characters", async () => {
        answerPrompts("a".repeat(129));

        await handlerPassword("password", userWithoutPassword);

        assert.equal(promptSecret.mock.callCount(), 1);
        assert.equal(setPassword.mock.callCount(), 0);
        assert.deepEqual(errors, [LENGTH_ERROR]);
        assert.equal(process.exitCode, 1);
    });

    it("stores a hash, not the plaintext, when the user has no password", async () => {
        const plaintext = "example-passphrase-1";
        answerPrompts(plaintext);

        await handlerPassword("password", userWithoutPassword);

        assert.equal(promptSecret.mock.callCount(), 1);
        assert.equal(setPassword.mock.callCount(), 1);
        const [user, storedHash] = setPassword.mock.calls[0].arguments;
        assert.deepEqual(user, userWithoutPassword);
        assert.notEqual(storedHash, plaintext);
        assert.equal(await verifyPassword(plaintext, storedHash), true);
        assert.deepEqual(logs, ["Password set successfully"]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });

    it("accepts a password of exactly 12 characters", async () => {
        answerPrompts("a".repeat(12));

        await handlerPassword("password", userWithoutPassword);

        assert.equal(promptSecret.mock.callCount(), 1);
        assert.equal(setPassword.mock.callCount(), 1);
        assert.deepEqual(logs, ["Password set successfully"]);
        assert.deepEqual(errors, []);
    });

    it("accepts a password of exactly 128 characters", async () => {
        answerPrompts("a".repeat(128));

        await handlerPassword("password", userWithoutPassword);

        assert.equal(promptSecret.mock.callCount(), 1);
        assert.equal(setPassword.mock.callCount(), 1);
        assert.deepEqual(logs, ["Password set successfully"]);
        assert.deepEqual(errors, []);
    });

    it("does not prompt for a current password when the user has no password", async () => {
        answerPrompts(newPassword);

        await handlerPassword("password", userWithoutPassword);

        assert.equal(promptSecret.mock.callCount(), 1);
    });

    it("replaces the password when the current password is correct", async () => {
        answerPrompts(newPassword, oldPassword);

        await handlerPassword("password", userWithPassword);

        assert.equal(promptSecret.mock.callCount(), 2);
        assert.equal(setPassword.mock.callCount(), 1);
        const [user, storedHash] = setPassword.mock.calls[0].arguments;
        assert.deepEqual(user, userWithPassword);
        assert.equal(await verifyPassword(newPassword, storedHash), true);
        assert.deepEqual(logs, ["Password set successfully"]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });

    it("rejects the change when the current password is incorrect", async () => {
        answerPrompts(newPassword, "wrong-passphrase-0000");

        await handlerPassword("password", userWithPassword);

        assert.equal(promptSecret.mock.callCount(), 2);
        assert.equal(setPassword.mock.callCount(), 0);
        assert.deepEqual(errors, ["Current password is incorrect"]);
        assert.deepEqual(logs, []);
        assert.equal(process.exitCode, 1);
    });

    it("rejects a new password shorter than 12 characters without prompting for the current password", async () => {
        answerPrompts("a".repeat(11), oldPassword);

        await handlerPassword("password", userWithPassword);

        assert.equal(promptSecret.mock.callCount(), 1);
        assert.equal(setPassword.mock.callCount(), 0);
        assert.deepEqual(errors, [LENGTH_ERROR]);
        assert.equal(process.exitCode, 1);
    });
});
