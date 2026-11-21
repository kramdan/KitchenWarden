import { createUser } from "./lib/db/queries/users.js";
import { getUser } from "./lib/db/queries/userget.js";
import { setUser } from "./config.js";

export async function handlerRegister(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length < 1) {
        console.error("Error: No username provided. Usage: register <username>");
        process.exitCode = 1;
        return;
    }
    const username = args[0].trim();
    if (!username) {
        console.error("Error: No username provided. Usage: register <username>");
        process.exitCode = 1;
        return;
    }
    if (await getUser(username)) {
        console.error(`Error: Username "${username}" is already registered.`);
        process.exitCode = 1;
        return;
    }
    await createUser(username);
    setUser(username);
    console.log(`User "${username}" has been registered.`);
}
