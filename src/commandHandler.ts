import { getCurrentUser } from "./lib/db/queries/getCurrentUser.js";
import { users } from "./lib/db/schema.js";

type LoggedInHandler = (
    cmdName: string,
    user: Awaited<ReturnType<typeof getCurrentUser>>,
) => Promise<void> | void;

export function middlewareLoggedIn(handler: LoggedInHandler) {
    return async (cmdName: string) => {
        return handler(cmdName, await getCurrentUser());
    };
}

export type User = typeof users.$inferSelect;