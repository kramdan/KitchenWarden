import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function createApp() {
    const viewsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "views");
    const app = express();
    app.disable("x-powered-by");
    const assetsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "assets");
    app.use("/assets", express.static(assetsDir, { dotfiles: "ignore" }));
    app.use(express.static(viewsDir, { index: "index.html", dotfiles: "ignore" }));
    return app;
}
