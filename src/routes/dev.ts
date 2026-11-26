import express from "express";
import type { Dependencies } from "../dependencies.js";
import { handlerReset } from "../dev/handlerReset.js";
import { requireCsrf } from "../lib/auth/middleware.js";
import { renderDevResetPage, renderDevResetResultPage } from "../views/dev.js";

// Dev-only routes. app.ts mounts this router only when deps.devTools is true.
export function createDevRouter(deps: Dependencies): express.Router {
    const router = express.Router();

    router.get("/health", (_req, res) => {
        res.json({ ok: true, app: "kitchen-warden" });
    });

    // The GET only shows the confirmation form. The POST performs the delete.
    router.get("/reset", (_req, res) => {
        res.type("html").send(renderDevResetPage({ csrfToken: res.locals.csrfToken }));
    });

    router.post("/reset", requireCsrf, async (_req, res) => {
        const deleted = await handlerReset("reset");
        res.type("html").send(renderDevResetResultPage(deleted));
    });

    return router;
}
