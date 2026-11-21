import { middlewareLoggedIn } from "./commandHandler.js";
import { CommandHandler, CommandRegistry, registerCommand, runCommand } from "./commandsRegistry.js";
import { handlerDelete } from "./handlerDelete.js";
import { handlerEmail } from "./handlerEmail.js";
import { handlerList } from "./handlerList.js";
import { handlerLogin } from "./handlerLogin.js";
import { handlerPassword } from "./handlerPassword.js";
import { handlerPhone } from "./handlerPhone.js";
import { handlerRegister } from "./handlerRegister.js";
import { startServer } from "./server.js";


export async function runCli(extraCommands: Record<string, CommandHandler> = {}) {
    const commandsReg = {} as CommandRegistry;
    registerCommand(commandsReg, 'register', handlerRegister);
    registerCommand(commandsReg, 'login', handlerLogin);
    registerCommand(commandsReg, 'list', handlerList);
    registerCommand(commandsReg, 'email', middlewareLoggedIn(handlerEmail));
    registerCommand(commandsReg, 'phone', middlewareLoggedIn(handlerPhone));
    registerCommand(commandsReg, 'password', middlewareLoggedIn(handlerPassword));
    registerCommand(commandsReg, 'delete', middlewareLoggedIn(handlerDelete));
    for (const [name, handler] of Object.entries(extraCommands)) {
        registerCommand(commandsReg, name, handler);
    }

    startServer();

    const cmd = process.argv.slice(2);
    if (cmd.length > 0) {
        await runCommand(commandsReg, cmd[0]);
    }
}
