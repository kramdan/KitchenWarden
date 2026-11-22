import { and, eq } from "drizzle-orm";
import { db } from "../index.js";
import { users } from "../schema.js";

export async function getUser(firstName: string, lastName: string) {
    const [result] = await db
        .select()
        .from(users)
        .where(and(eq(users.firstName, firstName), eq(users.lastName, lastName)));
    return result;
}

export async function getUserByEmail(email: string) {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return result;
}
