import { clearUser } from "../config.js";
import type { User } from "../lib/db/schema.js";
import { verifyPassword } from "../lib/password.js";
import { deleteUsers } from "../lib/db/queries/userdelete.js";
import { promptSecret } from "../lib/prompt.js";

export async function handlerDelete(cmdName: string, user: User): Promise<void> {
    if (!user.password) {
        console.error("Error: Set a password before deleting this account.");
        process.exitCode = 1;
        return;
    }
    const current = await promptSecret("Input current password: ");
    if (!await verifyPassword(current, user.password)) {
        console.error("Current password is incorrect");
        process.exitCode = 1;
        return;
    }
    await deleteUsers(user);
    clearUser();
    console.log(`User "${user.name}" has been deleted.`);
}
