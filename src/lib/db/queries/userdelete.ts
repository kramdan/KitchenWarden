import { eq } from "drizzle-orm";
import { User } from "../../../commandHandler.js";
import { db } from "../index.js";
import { users } from "../schema.js";

export async function deleteUsers(user: User) {
  await db.delete(users).where(eq(users.id, user.id));
}