import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clearFailures, isBlocked, recordFailure } from "../src/lib/auth/rateLimit.js";

const MINUTE_MS = 60 * 1000;
const WINDOW_MS = 15 * MINUTE_MS;
const START = Date.UTC(2026, 10, 22, 12, 0, 0);

function failTimes(key: string, times: number, now: number): void {
  for (let i = 0; i < times; i += 1) {
    recordFailure(key, now);
  }
}

// Each test uses its own key, so the module-level counters do not leak between tests.
describe("login rate limiter", () => {
  it("does not block a key after four failures", () => {
    const key = "email:four-failures@example.test";
    failTimes(key, 4, START);
    assert.equal(isBlocked(key, START), false);
  });

  it("blocks a key after five failures", () => {
    const key = "email:five-failures@example.test";
    failTimes(key, 5, START);
    assert.equal(isBlocked(key, START), true);
  });

  it("ends the block 15 minutes after the window starts", () => {
    const key = "email:window@example.test";
    failTimes(key, 5, START);
    assert.equal(isBlocked(key, START + WINDOW_MS - 1), true);
    assert.equal(isBlocked(key, START + WINDOW_MS), false);
  });

  it("keeps a block on one key from affecting other keys", () => {
    const blockedKey = "email:blocked@example.test";
    const otherKey = "email:other@example.test";
    failTimes(blockedKey, 5, START);
    assert.equal(isBlocked(blockedKey, START), true);
    assert.equal(isBlocked(otherKey, START), false);
  });

  it("clearFailures resets a blocked key", () => {
    const key = "email:cleared@example.test";
    failTimes(key, 5, START);
    clearFailures(key);
    assert.equal(isBlocked(key, START), false);
  });
});
