import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// Mocked so the test never opens the database, reads or writes kw.config.json,
// or loads argon2. Password hashes below are fake placeholders.
const getUser = mock.fn(async (_username: string): Promise<unknown> => undefined);
const setUser = mock.fn(async (_name: string): Promise<void> => undefined);
const verifyPassword = mock.fn(
    async (_password: string, _passwordHash: string): Promise<boolean> => false,
);

// Mocked so the test never reads from stdin. Only promptSecret is exported by its module.
const promptSecret = mock.fn(async (_question: string): Promise<string> => "");

// Mocked so the test never reads a username from stdin. Only promptText is exported by its module.
const promptText = mock.fn(async (_question: string): Promise<string> => "");

mock.module("../src/lib/db/queries/userget.js", {
    exports: { getUser },
});
mock.module("../src/config.js", {
    exports: { setUser },
});
mock.module("../src/handlerPassword.js", {
    exports: { verifyPassword },
});
mock.module("../src/lib/prompt.js", {
    exports: { promptSecret },
});
mock.module("../src/lib/promptText.js", {
    exports: { promptText },
});

const { handlerLogin } = await import("../src/handlerLogin.js");

const originalExitCode = process.exitCode;

const passwordUser = { id: "1", name: "alice", password: "fake-hash-alice" };
const openUsers: Record<string, unknown> = {
    alice: { id: "2", name: "alice", password: null },
    bob: { id: "3", name: "bob", password: null },
};

describe("handlerLogin", () => {
    let logs: string[];
    let errors: string[];

    beforeEach(() => {
        logs = [];
        errors = [];
        process.exitCode = undefined;
        getUser.mock.resetCalls();
        setUser.mock.resetCalls();
        verifyPassword.mock.resetCalls();
        promptSecret.mock.resetCalls();
        promptText.mock.resetCalls();
        getUser.mock.mockImplementation(async () => undefined);
        verifyPassword.mock.mockImplementation(async () => false);
        promptSecret.mock.mockImplementation(async () => "");
        mock.method(console, "log", (msg: string) => { logs.push(msg); });
        mock.method(console, "error", (msg: string) => { errors.push(msg); });
    });

    afterEach(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    it("logs in a user without a password and sets them as the current user", async () => {
        promptText.mock.mockImplementation(async () => "alice");
        getUser.mock.mockImplementation(async () => openUsers.alice);

        await handlerLogin("login");

        assert.equal(verifyPassword.mock.callCount(), 0);
        assert.deepEqual(setUser.mock.calls[0].arguments, ["alice"]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });

    it("does not prompt for a password when the user has none", async () => {
        promptText.mock.mockImplementation(async () => "alice");
        getUser.mock.mockImplementation(async () => openUsers.alice);

        await handlerLogin("login");

        assert.equal(promptSecret.mock.callCount(), 0);
    });

    it("logs in a user with the correct password and sets them as the current user", async () => {
        promptText.mock.mockImplementation(async () => "alice");
        getUser.mock.mockImplementation(async () => passwordUser);
        verifyPassword.mock.mockImplementation(async () => true);
        promptSecret.mock.mockImplementation(async () => "example-passphrase-1");

        await handlerLogin("login");

        assert.deepEqual(verifyPassword.mock.calls[0].arguments, [
            "example-passphrase-1",
            "fake-hash-alice",
        ]);
        assert.equal(setUser.mock.callCount(), 1);
        assert.deepEqual(setUser.mock.calls[0].arguments, ["alice"]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });

    it("sets the new current user when logging in after a previous login", async () => {
        getUser.mock.mockImplementation(async (name: string) => openUsers[name]);

        promptText.mock.mockImplementation(async () => "alice");
        await handlerLogin("login");
        promptText.mock.mockImplementation(async () => "bob");
        await handlerLogin("login");

        assert.equal(setUser.mock.callCount(), 2);
        assert.deepEqual(setUser.mock.calls[0].arguments, ["alice"]);
        assert.deepEqual(setUser.mock.calls[1].arguments, ["bob"]);
        assert.equal(process.exitCode, undefined);
    });

    it("trims whitespace from the username", async () => {
        promptText.mock.mockImplementation(async () => "  alice  ");
        getUser.mock.mockImplementation(async () => openUsers.alice);

        await handlerLogin("login");

        assert.deepEqual(getUser.mock.calls[0].arguments, ["alice"]);
        assert.deepEqual(setUser.mock.calls[0].arguments, ["alice"]);
        assert.equal(process.exitCode, undefined);
    });

    it("rejects an empty username", async () => {
        promptText.mock.mockImplementation(async () => "");

        await handlerLogin("login");

        assert.equal(getUser.mock.callCount(), 0);
        assert.equal(setUser.mock.callCount(), 0);
        assert.deepEqual(errors, ["Error: No username provided."]);
        assert.equal(process.exitCode, 1);
    });

    it("rejects a blank username", async () => {
        promptText.mock.mockImplementation(async () => "   ");

        await handlerLogin("login");

        assert.equal(getUser.mock.callCount(), 0);
        assert.equal(setUser.mock.callCount(), 0);
        assert.deepEqual(errors, ["Error: No username provided."]);
        assert.equal(process.exitCode, 1);
    });

    it("rejects a username that is not registered", async () => {
        promptText.mock.mockImplementation(async () => "ghost");

        await handlerLogin("login");

        assert.deepEqual(getUser.mock.calls[0].arguments, ["ghost"]);
        assert.equal(setUser.mock.callCount(), 0);
        assert.deepEqual(errors, ['Error: Username "ghost" not found.']);
        assert.equal(process.exitCode, 1);
    });

    it("rejects a wrong password without changing the current user", async () => {
        promptText.mock.mockImplementation(async () => "alice");
        getUser.mock.mockImplementation(async () => passwordUser);
        verifyPassword.mock.mockImplementation(async () => false);
        promptSecret.mock.mockImplementation(async () => "wrong-passphrase-1");

        await handlerLogin("login");

        assert.equal(verifyPassword.mock.callCount(), 1);
        assert.equal(setUser.mock.callCount(), 0);
        assert.deepEqual(errors, ["Current password is incorrect"]);
        assert.equal(process.exitCode, 1);
    });

    it("rejects an empty password for a user that has one, without changing the current user", async () => {
        promptText.mock.mockImplementation(async () => "alice");
        getUser.mock.mockImplementation(async () => passwordUser);
        promptSecret.mock.mockImplementation(async () => "");

        await handlerLogin("login");

        assert.deepEqual(verifyPassword.mock.calls[0].arguments, ["", "fake-hash-alice"]);
        assert.equal(setUser.mock.callCount(), 0);
        assert.deepEqual(errors, ["Current password is incorrect"]);
        assert.equal(process.exitCode, 1);
    });
});
