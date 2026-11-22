import { db } from "../index.js";
import { users } from "../schema.js";


export async function createUser(firstName: string, lastName: string, email: string, password?: string) {
    const [result] = await db
        .insert(users)
        .values({ firstName, lastName, email, password: password ?? null })
        .onConflictDoNothing()
        .returning();
    return result;
}
