import { db } from "../lib/db/index.js";
import { users } from "../lib/db/schema.js";

export async function deleteUsers() {
  const [result] = await db.delete(users).returning();
  return result;
}