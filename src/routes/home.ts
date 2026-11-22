import express from "express";
import type { Dependencies } from "../dependencies.js";
import { renderIndexPage } from "../views/index.js";

export function createHomeRouter(deps: Dependencies): express.Router {
    const router = express.Router();

    router.get("/", (_req, res) => {
        res.type("html").send(renderIndexPage());
    });

    return router;
}
