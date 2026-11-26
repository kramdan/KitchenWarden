import "./env.js";
import { initDependencies } from "./dependencies.js";
import { createApp } from "./app.js";
import { closeDb } from "./lib/db/index.js";

const deps = initDependencies();
let server;

try {
    const app = createApp(deps);
    server = app.listen(deps.port, deps.host,() => {
        console.log(`Kitchen Warden is running at http://localhost:${deps.port}`);
    });
    server.headersTimeout = 10_000;
    server.requestTimeout = 30_000;
    server.once("error", (error) => {
        closeDb();
        throw error;
    })
} catch (error) {
    server?.close();
    closeDb();
    throw error;
}