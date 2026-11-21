import { db } from "../index.js";
import { users } from "../schema.js";


export async function listUsers() {
    const results = await db.select().from(users);
    return results;
}