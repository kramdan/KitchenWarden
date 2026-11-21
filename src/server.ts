import { createApp } from "./app.js";

const host = "127.0.0.1";
const port = Number(process.env.PORT) || 3000;

export function startServer(): void {
    const server = createApp().listen(port, host, () => {
        console.log(`KitchenWarden web running at http://${host}:${port}`);
    });
    server.on("error", (err) => {
        console.error(`Error: Could not start web server on ${host}:${port}: ${err.message}`);
        process.exit(1);
    });
}
