import { createUser } from "./lib/db/queries/users.js";
import { getUser } from "./lib/db/queries/userget.js";
import { setUser } from "./config.js";
import { promptText } from "./lib/promptText.js";

export async function handlerRegister(cmdName: string): Promise<void> {
    const username = (await promptText("Enter username: ")).trim();
    if (!username) {
        console.error("Error: No username provided.");
        process.exitCode = 1;
        return;
    }
    if (await getUser(username)) {
        console.error(`Error: Username "${username}" is already registered.`);
        process.exitCode = 1;
        return;
    }
    await createUser(username);
    await setUser(username);
    console.log(`User "${username}" has been registered.`);
}
