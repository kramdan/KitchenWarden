import { eq } from "drizzle-orm";
import { User } from "../../../commandHandler.js";
import { db } from "../index.js";
import { users } from "../schema.js";



export async function setPhone(user: User, newPhone: string) {
    const [result] = await db.update(users).set({phoneNumber: newPhone}).where(eq(users.id, user.id)).returning();
    return result;
}