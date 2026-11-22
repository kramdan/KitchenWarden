import express, { type Request, type Response } from "express";
import type { Dependencies } from "../dependencies.js";
import { logEvent } from "../logger.js";
import { clearSessionCookie, setSessionCookie } from "../lib/auth/cookie.js";
import { requireCsrf, requireSession } from "../lib/auth/middleware.js";
import { createSession, destroyUserSessions } from "../lib/auth/session.js";
import type { User } from "../lib/db/schema.js";
import {
  AccountError,
  changeEmail,
  changePassword,
  changePhone,
  deleteAccount,
} from "../lib/services/accountServices.js";
import { renderAccountPage, type AccountView } from "../views/account.js";

// Success notices are looked up by key, so the query string never supplies page text.
const NOTICES = new Map<string, string>([
  ["email", "Email updated."],
  ["phone", "Phone number updated."],
  ["password", "Password changed."],
]);

function formText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function accountView(user: User): AccountView {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
  };
}

// Errors re-render the page with the current session, which is unchanged. Success redirects,
// so a browser refresh does not repeat the change.
function renderError(res: Response, user: User, error: string): void {
  res
    .status(400)
    .type("html")
    .send(renderAccountPage({ user: accountView(user), csrfToken: res.locals.csrfToken, error }));
}

export function createAccountRouter(deps: Dependencies): express.Router {
  const router = express.Router();

  router.get("/account", requireSession, (req: Request, res: Response) => {
    const key = typeof req.query.notice === "string" ? req.query.notice : "";
    res.type("html").send(
      renderAccountPage({
        user: accountView(res.locals.user),
        csrfToken: res.locals.csrfToken,
        notice: NOTICES.get(key),
      }),
    );
  });

  router.post("/account/email", requireSession, requireCsrf, async (req, res) => {
    const user: User = res.locals.user;
    try {
      await changeEmail(user, formText(req.body?.email));
      logEvent("account_email_changed", { userId: user.id });
      res.redirect("/account?notice=email");
    } catch (error) {
      if (error instanceof AccountError) {
        renderError(res, user, error.message);
        return;
      }
      throw error;
    }
  });

  router.post("/account/phone", requireSession, requireCsrf, async (req, res) => {
    const user: User = res.locals.user;
    try {
      await changePhone(user, formText(req.body?.phone));
      logEvent("account_phone_changed", { userId: user.id });
      res.redirect("/account?notice=phone");
    } catch (error) {
      if (error instanceof AccountError) {
        renderError(res, user, error.message);
        return;
      }
      throw error;
    }
  });

  router.post("/account/password", requireSession, requireCsrf, async (req, res) => {
    const user: User = res.locals.user;
    const newPassword = formText(req.body?.new_password);
    if (newPassword !== formText(req.body?.confirm_password)) {
      renderError(res, user, "New passwords do not match.");
      return;
    }
    try {
      await changePassword(user, newPassword, formText(req.body?.current_password));
      // Every session for this account ends, then a fresh one replaces the current cookie.
      await destroyUserSessions(user.id);
      setSessionCookie(res, await createSession(user.id));
      logEvent("account_password_changed", { userId: user.id });
      res.redirect("/account?notice=password");
    } catch (error) {
      if (error instanceof AccountError) {
        renderError(res, user, error.message);
        return;
      }
      throw error;
    }
  });

  router.post("/account/delete", requireSession, requireCsrf, async (req, res) => {
    const user: User = res.locals.user;
    try {
      // Deleting the user cascades to its sessions.
      await deleteAccount(user, formText(req.body?.password));
      clearSessionCookie(res);
      logEvent("account_deleted", { userId: user.id });
      res.redirect("/");
    } catch (error) {
      if (error instanceof AccountError) {
        renderError(res, user, error.message);
        return;
      }
      throw error;
    }
  });

  return router;
}
