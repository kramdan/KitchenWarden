import { setUser } from "../config.js";
import { verifyPassword } from "../lib/password.js";
import { getUser } from "../lib/db/queries/userget.js";
import { promptSecret } from "../lib/prompt.js";
import { promptText } from "../lib/promptText.js";

export async function handlerLogin(cmdName: string): Promise<void> {
    const username = (await promptText("Enter username: ")).trim();
    if (!username) {
        console.error("Error: No username provided.");
        process.exitCode = 1;
        return;
    }
    const user = await getUser(username);
    if (!user) {
        console.error(`Error: Username "${username}" not found.`);
        process.exitCode = 1;
        return;
    }
    if (user.password) {
        const current = await promptSecret("Input current password: ");
        if (!await verifyPassword(current, user.password)) {
            console.error("Current password is incorrect");
            process.exitCode = 1;
            return;
        }
    }
    await setUser(username);
}
