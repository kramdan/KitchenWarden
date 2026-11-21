import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { registerCommand, runCommand } from "../src/commandsRegistry.js";
import type { CommandRegistry } from "../src/commandsRegistry.js";

const originalExitCode = process.exitCode;

describe("commandsRegistry", () => {
    let errors: string[];

    beforeEach(() => {
        errors = [];
        process.exitCode = undefined;
        mock.method(console, "error", (msg: string) => { errors.push(msg); });
    });

    afterEach(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    it("registerCommand stores the handler under the command name", async () => {
        const registry: CommandRegistry = {};
        const handler = mock.fn(async (_cmdName: string): Promise<void> => undefined);

        await registerCommand(registry, "login", handler);

        assert.equal(registry.login, handler);
    });

    it("runCommand calls the registered handler with the command name only", async () => {
        const registry: CommandRegistry = {};
        const handler = mock.fn(async (_cmdName: string): Promise<void> => undefined);
        await registerCommand(registry, "login", handler);

        await runCommand(registry, "login");

        assert.equal(handler.mock.callCount(), 1);
        assert.deepEqual(handler.mock.calls[0].arguments, ["login"]);
        assert.equal(process.exitCode, undefined);
    });

    it("runCommand reports an unknown command and does not call any handler", async () => {
        const handler = mock.fn(async (_cmdName: string): Promise<void> => undefined);
        const registry: CommandRegistry = { login: handler };

        await runCommand(registry, "logout");

        assert.equal(handler.mock.callCount(), 0);
        assert.deepEqual(errors, ['Error: Command "logout" not found.']);
        assert.equal(process.exitCode, 1);
    });
});
