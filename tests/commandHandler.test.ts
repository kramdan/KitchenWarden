import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { User } from "../src/commandHandler.js";

// Mocked so the test never opens the database or reads kw.config.json.
// The real module imports the database connection, so it must not load.
const currentUser: User = {
    id: "00000000-0000-4000-8000-000000000001",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    name: "alice",
    email: null,
    phoneNumber: null,
    password: null,
};
const getCurrentUser = mock.fn(async (): Promise<User | undefined> => currentUser);

mock.module("../src/lib/db/queries/getCurrentUser.js", {
    exports: { getCurrentUser },
});

const { middlewareLoggedIn } = await import("../src/commandHandler.js");

const originalExitCode = process.exitCode;

describe("middlewareLoggedIn", () => {
    it("calls the wrapped handler with the command name and the current user", async () => {
        const handler = mock.fn(async (_cmdName: string, _user: User): Promise<void> => undefined);
        const wrapped = middlewareLoggedIn(handler);

        await wrapped("list");

        assert.equal(getCurrentUser.mock.callCount(), 1);
        assert.equal(handler.mock.callCount(), 1);
        assert.deepEqual(handler.mock.calls[0].arguments, ["list", currentUser]);
    });

    it("skips the wrapped handler and reports not logged in when there is no current user", async () => {
        const errors: string[] = [];
        process.exitCode = undefined;
        const error = mock.method(console, "error", (msg: string) => { errors.push(msg); });
        getCurrentUser.mock.mockImplementation(async () => undefined);
        const handler = mock.fn(async (_cmdName: string, _user: User): Promise<void> => undefined);
        const wrapped = middlewareLoggedIn(handler);

        try {
            await wrapped("list");

            assert.equal(handler.mock.callCount(), 0);
            assert.deepEqual(errors, ["Error: Not logged in. Run 'login' or 'register' first."]);
            assert.equal(process.exitCode, 1);
        } finally {
            error.mock.restore();
            getCurrentUser.mock.mockImplementation(async () => currentUser);
            process.exitCode = originalExitCode;
        }
    });
});
