import { getCurrentUser } from "./lib/db/queries/usercurrentget.js";

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
