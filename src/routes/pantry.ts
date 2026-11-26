import { Dependencies } from "../dependencies.js";
import express from "express";
import { renderPantryPage } from "../views/pantry.js";
import { requireCsrf, requireSession } from "../lib/auth/middleware.js";



export function createPantryRouter(deps: Dependencies): express.Router {
    const router = express.Router();

    router.get("/pantry", requireSession, (req, res) => {
        const key = typeof req.query.notice === "string" ? req.query.notice : "";
        res.type("html").send(renderPantryPage({ csrfToken: res.locals.csrfToken }));
    });

    return router;
}