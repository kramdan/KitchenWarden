import { middlewareLoggedIn } from "./handlers/commandHandler.js";
import { CommandHandler, CommandRegistry, registerCommand, runCommand } from "./handlers/commandsRegistry.js";
import { handlerDelete } from "./handlers/handlerDelete.js";
import { handlerEmail } from "./handlers/handlerEmail.js";
import { handlerList } from "./handlers/handlerList.js";
import { handlerLogin } from "./handlers/handlerLogin.js";
import { handlerPassword } from "./handlers/handlerPassword.js";
import { handlerPhone } from "./handlers/handlerPhone.js";
import { handlerRegister } from "./handlers/handlerRegister.js";


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

    const args = process.argv.slice(2);
    const cmd = args.filter((arg) => arg !== "--no-web");

    if (cmd.length > 0) {
        await runCommand(commandsReg, cmd[0]);
    } else {
        const err = new Error("Must insert a command and arguments 'command: arguments'");
        console.log(err.message);
        process.exitCode = 1;
    }
    process.exit(process.exitCode ?? 0);

}
