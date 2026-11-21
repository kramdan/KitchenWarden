import { ilike } from "drizzle-orm";
import { db } from "../index.js";
import { users } from "../schema.js";
import { readConfig } from "../../../config.js";

export async function getCurrentUser() {
  const currentUser = readConfig().currentUserName
  const [result] = await db.select().from(users).where(currentUser ? ilike(users.name, currentUser) : undefined);
  return result;
}