import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { hashPassword, MAX_PASSWORD_LENGTH, verifyPassword } from "../src/lib/password.js";

const PASSWORD = "correct horse battery staple";
const WRONG_PASSWORD = "wrong horse battery staple";

describe("password hashing", () => {
  it("verifies the right password against its hash", async () => {
    const hash = await hashPassword(PASSWORD);
    assert.equal(await verifyPassword(PASSWORD, hash), true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword(PASSWORD);
    assert.equal(await verifyPassword(WRONG_PASSWORD, hash), false);
  });

  it("hashPassword rejects a password over the maximum length with a RangeError", async () => {
    await assert.rejects(hashPassword("a".repeat(MAX_PASSWORD_LENGTH + 1)), RangeError);
  });

  it("verifyPassword returns false for a password over the maximum length", async () => {
    const hash = await hashPassword("a".repeat(MAX_PASSWORD_LENGTH));
    assert.equal(await verifyPassword("a".repeat(MAX_PASSWORD_LENGTH + 1), hash), false);
  });

  it("rejects a legacy SHA-256 hex hash, even with the right password", async () => {
    const legacyHash = createHash("sha256").update(PASSWORD).digest("hex");
    assert.equal(await verifyPassword(PASSWORD, legacyHash), false);
  });

  it("rejects a stored value that is neither argon2id nor hex", async () => {
    assert.equal(await verifyPassword(PASSWORD, "not-a-password-hash"), false);
  });
});
