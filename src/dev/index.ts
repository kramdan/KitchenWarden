import { runCli } from "../cli.js";
import { handlerReset } from "./handlerReset.js";

await runCli({ reset: handlerReset });
