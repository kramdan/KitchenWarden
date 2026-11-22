import { getCurrentUser } from "../lib/db/queries/getCurrentUser.js";
import { users } from "../lib/db/schema.js";

type LoggedInHandler = (
    cmdName: string,
    user: User,
) => Promise<void> | void;

export function middlewareLoggedIn(handler: LoggedInHandler) {
    return async (cmdName: string) => {
        const user = await getCurrentUser();
        if (!user) {
            console.error("Error: Not logged in. Run 'login' or 'register' first.");
            process.exitCode = 1;
            return;
        }
        return handler(cmdName, user);
    };
}

export type User = typeof users.$inferSelect;