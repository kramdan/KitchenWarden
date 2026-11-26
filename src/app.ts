import express, { type Response } from "express";
import path from "node:path";
import helmet from "helmet";
import { fileURLToPath } from "node:url";
import { Dependencies } from "./dependencies.js";
import { randomBytes, randomUUID } from "node:crypto";
import { errorHandler, sendErrorPage } from "./errors.js";
import cookieParser from "cookie-parser";
import { resolveSession } from "./lib/auth/middleware.js";
import { createHomeRouter } from "./routes/home.js";
import { createAuthRouter } from "./routes/auth.js";
import { createAccountRouter } from "./routes/account.js";

export function createApp(deps: Dependencies): express.Express {

    const app = express();
    app.set("trust proxy", deps.trustedProxyHops);
    app.use((_req, res, next) => {
        const newUUID = randomUUID();
        res.set("X-Request-ID", newUUID);
        res.locals.requestId = newUUID;
        next();
    });
    app.use((_req, res, next) => {
        const cspNonce = randomBytes(16).toString("base64");
        res.locals.cspNonce = cspNonce;
        next();
    });
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    scriptSrc: ["'self'", (_req, res) => `'nonce-${String((res as Response).locals.cspNonce)}'`],
                    styleSrc: ["'self'"],
                    frameSrc: ["'self'"],
                    upgradeInsecureRequests: null,
                },
            },
            referrerPolicy: { policy: "strict-origin-when-cross-origin" },
            xFrameOptions: { action: "sameorigin" },
            strictTransportSecurity: false,
        }));
    app.get("/health", (_req, res) => {
        res.json({ ok: true, app: "kitchen-warden" });
    });
    // Make load shedder here
    // Make rate limiter here

    // Put well-known page here

    // Begin route initializations
    const assetsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "assets");
    // Cache policy. Pages that carry session data or CSRF tokens are never stored by the
    // browser or a proxy. The splash page is revalidated on each visit. Assets are versioned
    // in layout.ts, so they can be cached for a long time.
    const isPrivatePath = (requestPath: string) => /^\/(auth|account)(\/|$)/.test(requestPath);
    app.use((req, res, next) => {
        if (req.path === "/") {
            res.set("Cache-Control", "no-cache");
        } else if (isPrivatePath(req.path)) {
            res.set("Cache-Control", "no-store");
        }
        next();
    });
    app.use("/assets", express.static(assetsDir, { dotfiles: "ignore", maxAge: "1y", immutable: true }));
    app.use(
        "/assets/aesthetics",
        express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), "views", "aesthetics"), {
            dotfiles: "ignore",
            maxAge: "1y",
            immutable: true,
        }),
    );
    // Parsers and session resolution come after the static assets, so asset requests never
    // reach the database.
    app.use(cookieParser());
    app.use(express.urlencoded({ extended: false, limit: deps.maxRequestBodyBytes }));
    app.use(resolveSession);
    app.use(createHomeRouter(deps));
    app.use(createAuthRouter(deps));
    app.use(createAccountRouter(deps));

// At this point if no page has been found, sending a 404 error page
    app.use((_req, res) => {
        sendErrorPage(
            res,
            404,
            "Page Not Found",
            "We couldn't find the page you requested",
        );
    });
    app.use(errorHandler);
    return app;
}
