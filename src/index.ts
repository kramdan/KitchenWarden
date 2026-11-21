import { CommandRegistry, registerCommand, runCommand } from "./commandsRegistry.js";
import { handlerList } from "./handlerList.js";
import { handlerLogin } from "./handlerLogin.js";
import { handlerRegister } from "./handlerRegister.js";
import { handlerReset } from "./handlerReset.js";


async function main() {
    const commandsReg = {} as CommandRegistry;
    registerCommand(commandsReg, 'register', handlerRegister);
    registerCommand(commandsReg, 'login', handlerLogin);
    registerCommand(commandsReg, 'reset', handlerReset);
    registerCommand(commandsReg, 'list', handlerList);

    const cmd = process.argv.slice(2);

    if (cmd.length == 0) {
        const err =  new Error("Must insert a command and arguments 'command: arguments'");
        console.log(err.message);
        process.exitCode = 1;
    } else {
        const commandName = cmd[0];
        const commandArgs = cmd.slice(1);
        await runCommand(commandsReg, commandName, ...commandArgs);
    }
    if (process.exitCode != 1) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

await main();