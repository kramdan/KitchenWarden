import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { User } from "../src/commandHandler.js";

// Mocked so the test never opens the database.
const setEmail = mock.fn(
    async (_user: User, newEmail: string): Promise<{ email: string }> => ({ email: newEmail }),
);

// Mocked so the test never reads from stdin. Only promptText is exported by its module.
const promptText = mock.fn(async (_question: string): Promise<string> => "");

mock.module("../src/lib/db/queries/setEmail.js", {
    exports: { setEmail },
});

mock.module("../src/lib/promptText.js", {
    exports: { promptText },
});

const { handlerEmail } = await import("../src/handlerEmail.js");

const originalExitCode = process.exitCode;

const userWithPassword: User = {
    id: "00000000-0000-4000-8000-000000000001",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    name: "alice",
    email: null,
    phoneNumber: null,
    password: "fake-hash-alice",
};
const userWithoutPassword: User = { ...userWithPassword, password: null };
const userWithEmail: User = { ...userWithPassword, email: "alice@example.com" };

describe("handlerEmail", () => {
    let logs: string[];
    let errors: string[];

    beforeEach(() => {
        logs = [];
        errors = [];
        process.exitCode = undefined;
        setEmail.mock.resetCalls();
        promptText.mock.resetCalls();
        mock.method(console, "log", (msg: string) => { logs.push(msg); });
        mock.method(console, "error", (msg: string) => { errors.push(msg); });
    });

    afterEach(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    it("rejects an email change when the user has no password", async () => {
        await handlerEmail("email", userWithoutPassword);

        assert.equal(promptText.mock.callCount(), 0);
        assert.equal(setEmail.mock.callCount(), 0);
        assert.deepEqual(errors, ["Set a password first"]);
        assert.equal(process.exitCode, 1);
    });

    for (const email of ["not-an-email", "a..b@example.com", "alice@example"]) {
        it(`rejects the malformed email "${email}"`, async () => {
            promptText.mock.mockImplementation(async () => email);

            await handlerEmail("email", userWithPassword);

            assert.equal(setEmail.mock.callCount(), 0);
            assert.deepEqual(errors, ["Not a valid email"]);
            assert.equal(process.exitCode, 1);
        });
    }

    it("saves a valid email when the user has a password", async () => {
        promptText.mock.mockImplementation(async () => "alice@example.com");

        await handlerEmail("email", userWithPassword);

        assert.equal(setEmail.mock.callCount(), 1);
        assert.deepEqual(setEmail.mock.calls[0].arguments, [userWithPassword, "alice@example.com"]);
        assert.deepEqual(logs, ["Email changed to: alice@example.com"]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });

    it("trims surrounding whitespace before validating and saving", async () => {
        promptText.mock.mockImplementation(async () => "  alice@example.com\t");

        await handlerEmail("email", userWithPassword);

        assert.equal(setEmail.mock.callCount(), 1);
        assert.deepEqual(setEmail.mock.calls[0].arguments, [userWithPassword, "alice@example.com"]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });

    it("rejects an email that already matches the user's current email", async () => {
        promptText.mock.mockImplementation(async () => "alice@example.com");

        await handlerEmail("email", userWithEmail);

        assert.equal(setEmail.mock.callCount(), 0);
        assert.deepEqual(errors, ["Email already matches"]);
        assert.equal(process.exitCode, 1);
    });
});
