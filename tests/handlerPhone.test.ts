import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { User } from "../src/commandHandler.js";

// Mocked so the test never opens the database.
const setPhone = mock.fn(
    async (_user: User, newPhone: string): Promise<{ phoneNumber: string }> => ({ phoneNumber: newPhone }),
);

// Mocked so the test never reads from stdin. Only promptText is exported by its module.
const promptText = mock.fn(async (_question: string): Promise<string> => "");

mock.module("../src/lib/db/queries/setPhone.js", {
    exports: { setPhone },
});

mock.module("../src/lib/promptText.js", {
    exports: { promptText },
});

const { handlerPhone } = await import("../src/handlerPhone.js");

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
const userWithPhone: User = { ...userWithPassword, phoneNumber: "2125550143" };

describe("handlerPhone", () => {
    let logs: string[];
    let errors: string[];

    beforeEach(() => {
        logs = [];
        errors = [];
        process.exitCode = undefined;
        setPhone.mock.resetCalls();
        promptText.mock.resetCalls();
        mock.method(console, "log", (msg: string) => { logs.push(msg); });
        mock.method(console, "error", (msg: string) => { errors.push(msg); });
    });

    afterEach(() => {
        mock.restoreAll();
        process.exitCode = originalExitCode;
    });

    it("rejects a phone change when the user has no password", async () => {
        await handlerPhone("phone", userWithoutPassword);

        assert.equal(promptText.mock.callCount(), 0);
        assert.equal(setPhone.mock.callCount(), 0);
        assert.deepEqual(errors, ["Set a password first"]);
        assert.equal(process.exitCode, 1);
    });

    for (const phone of ["212555014", "0125550143", "1125550143", "212555ABCD"]) {
        it(`rejects the invalid phone number "${phone}"`, async () => {
            promptText.mock.mockImplementation(async () => phone);

            await handlerPhone("phone", userWithPassword);

            assert.equal(setPhone.mock.callCount(), 0);
            assert.deepEqual(errors, ["Not a valid phone number"]);
            assert.equal(process.exitCode, 1);
        });
    }

    it("saves a valid 10-digit phone number when the user has a password", async () => {
        promptText.mock.mockImplementation(async () => "2125550143");

        await handlerPhone("phone", userWithPassword);

        assert.equal(setPhone.mock.callCount(), 1);
        assert.deepEqual(setPhone.mock.calls[0].arguments, [userWithPassword, "2125550143"]);
        assert.deepEqual(logs, ["Phone number changed to: 2125550143"]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });

    it("trims surrounding whitespace before validating and saving", async () => {
        promptText.mock.mockImplementation(async () => "  2125550143\t");

        await handlerPhone("phone", userWithPassword);

        assert.equal(setPhone.mock.callCount(), 1);
        assert.deepEqual(setPhone.mock.calls[0].arguments, [userWithPassword, "2125550143"]);
        assert.deepEqual(logs, ["Phone number changed to: 2125550143"]);
        assert.deepEqual(errors, []);
        assert.equal(process.exitCode, undefined);
    });

    it("rejects a phone number that matches the user's current phone number", async () => {
        promptText.mock.mockImplementation(async () => "2125550143");

        await handlerPhone("phone", userWithPhone);

        assert.equal(setPhone.mock.callCount(), 0);
        assert.deepEqual(errors, ["Phone number matches"]);
        assert.equal(process.exitCode, 1);
    });
});
