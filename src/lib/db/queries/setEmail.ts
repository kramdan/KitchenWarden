import { eq } from "drizzle-orm";
import { User } from "../../../handlers/commandHandler.js";
import { db } from "../index.js";
import { users } from "../schema.js";



export async function setEmail(user: User, newEmail: string) {
    const [result] = await db.update(users).set({email: newEmail}).where(eq(users.id, user.id)).returning();
    return result;
}