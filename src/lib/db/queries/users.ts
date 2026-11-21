import { db } from "../index.js";
import { users } from "../schema.js";


export async function createUser(username: string) {
    const [result] = await db.insert(users).values({name: username}).onConflictDoNothing().returning();
    return result;
}