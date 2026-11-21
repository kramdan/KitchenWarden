import { setUser } from "./config.js";
import { verifyPassword } from "./handlerPassword.js";
import { getUser } from "./lib/db/queries/userget.js";

export async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
    const username = args[0]?.trim();
    const password = args[1]?.trim();
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
    const user = await getUser(username);
    if (user.password) {
        if (password == undefined) {
            console.error("password invalid");
            process.exitCode = 1;
            return;
        }
        if (!await verifyPassword(password, user.password)) {
            console.error("password invalid");
            process.exitCode = 1;
            return;
        }
    }
    await setUser(username);
}
