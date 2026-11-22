import express, { type Response } from "express";
import type { Dependencies } from "../dependencies.js";
import { sendErrorPage } from "../errors.js";

export function createAccountRouter(deps: Dependencies): express.Router {
    const router = express.Router();

    // TODO: each route resolves the session user before doing anything else.
    // TODO: render with renderAccountPage once implemented.
    router.get("/account", (_req, res) => {
        notImplemented(res);
    });
    router.post("/account/email", (_req, res) => {
        notImplemented(res);
    });
    router.post("/account/phone", (_req, res) => {
        notImplemented(res);
    });
    router.post("/account/password", (_req, res) => {
        notImplemented(res);
    });
    router.post("/account/delete", (_req, res) => {
        notImplemented(res);
    });

    return router;
}

function notImplemented(res: Response): void {
    sendErrorPage(res, 501, "Not Implemented", "This page is not available yet.");
}
