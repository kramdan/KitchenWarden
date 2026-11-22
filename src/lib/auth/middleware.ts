import type { NextFunction, Request, Response } from "express";
import { sendErrorPage } from "../../errors.js";
import { clearSessionCookie, setCsrfCookie } from "./cookie.js";
import { CSRF_COOKIE, csrfTokensMatch, newCsrfToken } from "./csrf.js";
import { loadSession, SESSION_COOKIE } from "./session.js";

// Puts the signed-in user, or the anonymous CSRF token, into res.locals for the routes.
// Views never read res.locals; routes pass these values to the render functions.
export async function resolveSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    const session = typeof token === "string" && token !== "" ? await loadSession(token) : undefined;
    if (session) {
      res.locals.user = session.user;
      res.locals.csrfToken = session.csrfToken;
    } else {
      if (token !== undefined) {
        clearSessionCookie(res);
      }
      let csrfToken = req.cookies?.[CSRF_COOKIE];
      if (typeof csrfToken !== "string" || csrfToken === "") {
        csrfToken = newCsrfToken();
        setCsrfCookie(res, csrfToken);
      }
      res.locals.csrfToken = csrfToken;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireSession(_req: Request, res: Response, next: NextFunction): void {
  if (!res.locals.user) {
    res.redirect("/auth/login");
    return;
  }
  next();
}

export function redirectIfSignedIn(_req: Request, res: Response, next: NextFunction): void {
  if (res.locals.user) {
    res.redirect("/account");
    return;
  }
  next();
}

// Every POST must repeat the CSRF token from res.locals in a "csrf_token" form field.
export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  if (!csrfTokensMatch(res.locals.csrfToken, req.body?.csrf_token)) {
    sendErrorPage(res, 403, "Request Not Accepted", "The form has expired. Reload the page and try again.");
    return;
  }
  next();
}
