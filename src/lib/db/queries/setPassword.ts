import { eq } from "drizzle-orm";
import { User } from "../schema.js";
import { db } from "../index.js";
import { users } from "../schema.js";


export async function setPassword(user: User, password: string) {
    await db.update(users).set({password: password}).where(eq(users.id, user.id));
}