import express, { type Request } from "express";
import type { Dependencies } from "../dependencies.js";
import { logEvent } from "../logger.js";
import { clearSessionCookie, setSessionCookie } from "../lib/auth/cookie.js";
import { redirectIfSignedIn, requireCsrf } from "../lib/auth/middleware.js";
import { clearFailures, isBlocked, recordFailure } from "../lib/auth/rateLimit.js";
import { createSession, destroySession, purgeExpiredSessions, SESSION_COOKIE } from "../lib/auth/session.js";
import { AccountError, authenticate, registerAccount } from "../lib/services/accountServices.js";
import { renderLoginPage, renderRegisterPage } from "../views/auth.js";

// The same message for an unknown email and a wrong password, so neither can be told apart.
const LOGIN_FAILED = "Email or password incorrect";
const LOGIN_BLOCKED = "Too many failed attempts. Try again in a few minutes.";

function formText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sessionToken(req: Request): string | undefined {
  const token = req.cookies?.[SESSION_COOKIE];
  return typeof token === "string" && token !== "" ? token : undefined;
}

export function createAuthRouter(deps: Dependencies): express.Router {
  const router = express.Router();

  router.get("/auth/register", redirectIfSignedIn, (_req, res) => {
    res.type("html").send(renderRegisterPage({ csrfToken: res.locals.csrfToken }));
  });

  router.post("/auth/register", redirectIfSignedIn, requireCsrf, async (req, res) => {
    const values = {
      firstName: formText(req.body?.first_name).trim(),
      lastName: formText(req.body?.last_name).trim(),
      email: formText(req.body?.email).trim(),
    };
    const password = formText(req.body?.password);
    const confirmPassword = formText(req.body?.confirm_password);

    const reject = (error: string) => {
      res
        .status(400)
        .type("html")
        .send(renderRegisterPage({ csrfToken: res.locals.csrfToken, error, values }));
    };

    if (password !== confirmPassword) {
      reject("Passwords do not match.");
      return;
    }
    try {
      const user = await registerAccount({ ...values, password });
      const token = await createSession(user.id);
      setSessionCookie(res, token);
      logEvent("account_registered", { userId: user.id });
      res.redirect("/account");
    } catch (error) {
      if (error instanceof AccountError) {
        reject(error.message);
        return;
      }
      throw error;
    }
  });

  router.get("/auth/login", redirectIfSignedIn, (_req, res) => {
    res.type("html").send(renderLoginPage({ csrfToken: res.locals.csrfToken }));
  });

  router.post("/auth/login", requireCsrf, async (req, res) => {
    const email = formText(req.body?.email).trim().toLowerCase();
    const password = formText(req.body?.password);
    const emailKey = `email:${email}`;
    const ipKey = `ip:${req.ip ?? "unknown"}`;

    const render = (status: number, error: string) => {
      res
        .status(status)
        .type("html")
        .send(renderLoginPage({ csrfToken: res.locals.csrfToken, error }));
    };

    if (isBlocked(emailKey) || isBlocked(ipKey)) {
      logEvent("login_blocked", {});
      render(429, LOGIN_BLOCKED);
      return;
    }

    const user = await authenticate(email, password);
    if (!user) {
      recordFailure(emailKey);
      recordFailure(ipKey);
      logEvent("login_failed", {});
      render(401, LOGIN_FAILED);
      return;
    }

    clearFailures(emailKey);
    // A new session replaces any existing one, so an old token cannot be reused (session fixation).
    const previous = sessionToken(req);
    if (previous) {
      await destroySession(previous);
    }
    const token = await createSession(user.id);
    setSessionCookie(res, token);
    await purgeExpiredSessions();
    logEvent("login_succeeded", { userId: user.id });
    res.redirect("/account");
  });

  router.post("/auth/logout", requireCsrf, async (req, res) => {
    const token = sessionToken(req);
    if (token) {
      await destroySession(token);
    }
    clearSessionCookie(res);
    logEvent("logout", {});
    res.redirect("/");
  });

  return router;
}
