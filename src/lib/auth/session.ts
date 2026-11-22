import { createHash, randomBytes } from "node:crypto";
import { eq, lte, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, users, type User } from "../db/schema.js";

export const SESSION_COOKIE = "kw_session";

// Idle timeout: a session expires this long after its last request.
// Absolute timeout: no session lives longer than this after it was created.
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

// Only the hash of a session token is stored, so a leaked database does not yield live sessions.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

// The new expires_at: the idle limit from now, capped by the absolute limit from creation.
// It is written when a session is created and when it is refreshed. Expiry is checked by
// comparing expires_at with the current time, not by recalculating the limits.
function expiryFrom(now: Date, createdAt: Date): Date {
  const idleLimit = now.getTime() + IDLE_TIMEOUT_MS;
  const absoluteLimit = createdAt.getTime() + ABSOLUTE_TIMEOUT_MS;
  return new Date(Math.min(idleLimit, absoluteLimit));
}

export type LoadedSession = { user: User; csrfToken: string };

// Creates a session and returns the raw token for the cookie. Call this only after the
// password has been verified.
export async function createSession(userId: string, now: Date = new Date()): Promise<string> {
  const token = newSessionToken();
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    csrfToken: newSessionToken(),
    createdAt: now,
    updatedAt: now,
    expiresAt: expiryFrom(now, now),
  });
  return token;
}

// Returns the user and CSRF token for a live session. A session past its expires_at, or
// already flagged, is marked expired and rejected. A live session is refreshed: updated_at
// and expires_at move forward, still capped by the absolute limit.
export async function loadSession(token: string, now: Date = new Date()): Promise<LoadedSession | undefined> {
  const tokenHash = hashToken(token);
  const [row] = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash));
  if (!row) {
    return undefined;
  }
  if (row.expired || row.expiresAt.getTime() <= now.getTime()) {
    await db.update(sessions).set({ expired: true }).where(eq(sessions.tokenHash, tokenHash));
    return undefined;
  }
  const [user] = await db.select().from(users).where(eq(users.id, row.userId));
  if (!user) {
    return undefined;
  }
  await db
    .update(sessions)
    .set({ updatedAt: now, expiresAt: expiryFrom(now, row.createdAt) })
    .where(eq(sessions.tokenHash, tokenHash));
  return { user, csrfToken: row.csrfToken };
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

// Used after a password change or account deletion.
export async function destroyUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// Removes flagged sessions and sessions past their expires_at.
export async function purgeExpiredSessions(now: Date = new Date()): Promise<void> {
  await db.delete(sessions).where(or(eq(sessions.expired, true), lte(sessions.expiresAt, now)));
}
