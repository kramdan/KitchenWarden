// In-memory failed-login counters. Keys are chosen by the caller, for example "email:<address>"
// and "ip:<address>". Counters reset when the server restarts, which is acceptable for a single
// local process.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const PRUNE_ABOVE = 1000;

type Counter = { failures: number; windowStart: number };
const counters = new Map<string, Counter>();

// Returns the counter if it is still inside its window. An expired counter is removed.
function live(key: string, now: number): Counter | undefined {
  const counter = counters.get(key);
  if (counter && now - counter.windowStart >= WINDOW_MS) {
    counters.delete(key);
    return undefined;
  }
  return counter;
}

// True while the key has reached the failure limit inside the current window. The block
// ends when the window passes. It is not an account lockout: other keys are unaffected.
export function isBlocked(key: string, now: number = Date.now()): boolean {
  return (live(key, now)?.failures ?? 0) >= MAX_FAILURES;
}

export function recordFailure(key: string, now: number = Date.now()): void {
  if (counters.size > PRUNE_ABOVE) {
    for (const existing of counters.keys()) {
      live(existing, now);
    }
  }
  const counter = live(key, now);
  if (counter) {
    counter.failures += 1;
  } else {
    counters.set(key, { failures: 1, windowStart: now });
  }
}

export function clearFailures(key: string): void {
  counters.delete(key);
}
