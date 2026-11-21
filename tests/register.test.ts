import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// Mocked so the test never opens the database or writes kw.config.json.
const getUser = mock.fn(async (_username: string): Promise<unknown> => undefined);
const createUser = mock.fn(async (_username: string): Promise<unknown> => undefined);
const setUser = mock.fn(async (_name: string): Promise<void> => undefined);

// Mocked so the test never reads from stdin. Only promptText is exported by its module.
const promptText = mock.fn(async (_question: string): Promise<string> => "");

mock.module("../src/lib/db/queries/userget.js", {
    exports: { getUser },
});
mock.module("../src/lib/db/queries/users.js", {
    exports: { createUser },
});
mock.module("../src/config.js", {
    exports: { setUser },
});
mock.module("../src/lib/promptText.js", {
    exports: { promptText },
});

const { handlerRegister } = await import("../src/handlerRegister.js");

const originalExitCode = process.exitCode;

describe("handlerRegister", () => {
    let logs: string[];
    let errors: string[];

    beforeEach(() => {
        logs = [];
        errors = [];
        process.exitCode = undefined;
        getUser.mock.resetCalls();
        createUser.mock.resetCalls();
        setUser.mock.resetCalls();
        promptText.mock.resetCalls();
        getUser.mock.mockImplementation(async () => undefined);
        mock.method(console, "log", (msg: string) => { logs.push(msg); });
        mock.method(console, "error", (msg: string) => { errors.push(msg); });
    });

    afterEach(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    it("registers a new user and sets them as the current user", async () => {
        promptText.mock.mockImplementation(async () => "alice");

        await handlerRegister("register");

        assert.equal(createUser.mock.callCount(), 1);
        assert.deepEqual(createUser.mock.calls[0].arguments, ["alice"]);
        assert.deepEqual(setUser.mock.calls[0].arguments, ["alice"]);
        assert.deepEqual(logs, ['User "alice" has been registered.']);
        assert.equal(process.exitCode, undefined);
    });

    it("trims whitespace from the username", async () => {
        promptText.mock.mockImplementation(async () => "  alice  ");

        await handlerRegister("register");

        assert.deepEqual(getUser.mock.calls[0].arguments, ["alice"]);
        assert.deepEqual(createUser.mock.calls[0].arguments, ["alice"]);
        assert.deepEqual(setUser.mock.calls[0].arguments, ["alice"]);
    });

    it("rejects a username that is already registered", async () => {
        promptText.mock.mockImplementation(async () => "alice");
        getUser.mock.mockImplementation(async () => ({ id: "1", name: "alice" }));

        await handlerRegister("register");

        assert.equal(createUser.mock.callCount(), 0);
        assert.equal(setUser.mock.callCount(), 0);
        assert.deepEqual(errors, ['Error: Username "alice" is already registered.']);
        assert.equal(process.exitCode, 1);
    });

    it("rejects an empty username", async () => {
        promptText.mock.mockImplementation(async () => "");

        await handlerRegister("register");

        assert.equal(getUser.mock.callCount(), 0);
        assert.equal(createUser.mock.callCount(), 0);
        assert.equal(setUser.mock.callCount(), 0);
        assert.deepEqual(errors, ["Error: No username provided."]);
        assert.equal(process.exitCode, 1);
    });

    it("rejects a blank username", async () => {
        promptText.mock.mockImplementation(async () => "   ");

        await handlerRegister("register");

        assert.equal(getUser.mock.callCount(), 0);
        assert.equal(createUser.mock.callCount(), 0);
        assert.equal(setUser.mock.callCount(), 0);
        assert.deepEqual(errors, ["Error: No username provided."]);
        assert.equal(process.exitCode, 1);
    });
});
