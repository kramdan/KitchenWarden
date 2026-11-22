import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { csrfTokensMatch } from "../src/lib/auth/csrf.js";

const TOKEN = "token-value-1";

describe("csrfTokensMatch", () => {
  it("accepts matching tokens", () => {
    assert.equal(csrfTokensMatch(TOKEN, TOKEN), true);
  });

  it("rejects mismatched tokens of the same length", () => {
    assert.equal(csrfTokensMatch(TOKEN, "token-value-2"), false);
  });

  it("rejects a missing value on either side", () => {
    assert.equal(csrfTokensMatch(TOKEN, undefined), false);
    assert.equal(csrfTokensMatch(undefined, TOKEN), false);
  });

  it("rejects non-string values", () => {
    assert.equal(csrfTokensMatch(TOKEN, [TOKEN]), false);
    assert.equal(csrfTokensMatch(TOKEN, 12345), false);
  });

  it("rejects empty values", () => {
    assert.equal(csrfTokensMatch("", ""), false);
    assert.equal(csrfTokensMatch(TOKEN, ""), false);
  });

  it("returns false without throwing when the values have different lengths", () => {
    assert.doesNotThrow(() => csrfTokensMatch("short", "a-much-longer-token"));
    assert.equal(csrfTokensMatch("short", "a-much-longer-token"), false);
  });
});
