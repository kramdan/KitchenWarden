import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { users } from "../schema.js";

export async function getUserById(userId: string) {
    const [result] = await db.select().from(users).where(eq(users.id, userId));
    return result;
}