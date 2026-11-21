import { getCurrentUser } from "./lib/db/queries/getCurrentUser.js";
import { users } from "./lib/db/schema.js";

type LoggedInHandler = (
    cmdName: string,
    user: Awaited<ReturnType<typeof getCurrentUser>>,
    ...args: string[]
) => Promise<void> | void;

export function middlewareLoggedIn(handler: LoggedInHandler) {
    return async (cmdName: string, ...args: string[]) => {
        return handler(cmdName, await getCurrentUser(), ...args);
    };
}

export type User = typeof users.$inferSelect;