import { setUser } from "./config.js";
import { getUser } from "./lib/db/queries/userget.js";

export async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
    const username = args[0]?.trim();
    if (!username) {
        console.error("Error: No username provided. Usage: login <username>");
        process.exitCode = 1;
        return;
    }
    if (!(await getUser(username))) {
        console.error(`Error: Username "${username}" not found.`);
        process.exitCode = 1;
        return;
    }
    setUser(username);
}
