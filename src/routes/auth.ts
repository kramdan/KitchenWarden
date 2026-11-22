import express, { type Response } from "express";
import { randomBytes } from "node:crypto";
import type { Dependencies } from "../dependencies.js";
import { sendErrorPage } from "../errors.js";
import { renderLoginPage } from "../views/auth.js";

export function createAuthRouter(deps: Dependencies): express.Router {
    const router = express.Router();

    // TODO: render with renderRegisterPage once implemented.
    router.get("/auth/register", (_req, res) => {
        notImplemented(res);
    });
    router.post("/auth/register", (_req, res) => {
        notImplemented(res);
    });

    router.get("/auth/login", (_req, res) => {
        res.type("html").send(renderLoginPage({ csrfToken: placeholderCsrfToken() }));
    });
    // TODO: check the CSRF token and verify credentials once sessions are implemented.
    router.post("/auth/login", (_req, res) => {
        notImplemented(res);
    });

    router.post("/auth/logout", (_req, res) => {
        notImplemented(res);
    });

    return router;
}

// Placeholder until sessions exist. The token is not bound to a session and no route
// checks it yet, so it protects nothing. Replace it before POST /auth/login is built.
function placeholderCsrfToken(): string {
    return randomBytes(32).toString("base64url");
}

function notImplemented(res: Response): void {
    sendErrorPage(res, 501, "Not Implemented", "This page is not available yet.");
}
