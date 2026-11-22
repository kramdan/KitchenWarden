export type CommandHandler = (cmdName: string) => Promise<void> | void;
export type CommandRegistry = Record<string, CommandHandler>;

export async function registerCommand(registry: CommandRegistry, cmdName: string, handler: CommandHandler): Promise<void> {
    registry[cmdName] = handler;
}
export async function runCommand(registry: CommandRegistry, cmdName: string): Promise<void> {
    const handler = registry[cmdName];
    if (!handler) {
        console.error(`Error: Command "${cmdName}" not found.`);
        process.exitCode = 1;
        return;
    }
    await handler(cmdName);
}
