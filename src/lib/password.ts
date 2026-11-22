import { hash, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";

export const MAX_PASSWORD_LENGTH = 128;
const LEGACY_SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new RangeError(
      `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`,
    );
  }
  const hashed = await argon2.hash(password, PASSWORD_HASH_OPTIONS);
  return hashed;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (password.length > MAX_PASSWORD_LENGTH) {
    return false;
  }

  if (LEGACY_SHA256_PATTERN.test(passwordHash)) {
    const candidateHash = Buffer.from(await hash("SHA-256", password), "hex");
    const storedHash = Buffer.from(passwordHash, "hex");
    return timingSafeEqual(candidateHash, storedHash);
  }
  if (passwordHash.startsWith("$argon2id$")) {
    try {
      if (await argon2.verify(passwordHash, password)) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      throw new Error(`${err}`);
    }
  }
  return false;
}
