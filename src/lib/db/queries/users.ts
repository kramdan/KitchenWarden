import { db } from "../index.js";
import { groups, userGroups, users } from "../schema.js";


// Creates the user's primary group and the manager membership in one transaction. If the user
// insert conflicts, the transaction rolls back, so no orphan group is left behind.
export async function createUser(firstName: string, lastName: string, email: string, password?: string) {
    return db.transaction(async (tx) => {
        const [group] = await tx
            .insert(groups)
            .values({ name: `${firstName} ${lastName}` })
            .returning();
        const [result] = await tx
            .insert(users)
            .values({ firstName, lastName, email, password: password ?? null, primaryGroupId: group.id })
            .onConflictDoNothing()
            .returning();
        if (!result) {
            tx.rollback();
        }
        await tx.insert(userGroups).values({ userId: result.id, groupId: group.id, role: "manager" });
        return result;
    });
}
