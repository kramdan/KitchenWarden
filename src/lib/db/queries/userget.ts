import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { users } from "../schema.js";

export async function getUser(username: string) {
    const [result] = await db.select().from(users).where(eq(users.name, username));
    return result;
}