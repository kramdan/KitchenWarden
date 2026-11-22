# Web Systems Plan

Superseded by `docs/web-first-plan.md` (Part A). Decisions are recorded there.

Status: draft for review. Scope: Phase 0, decision 1 (web first, CLI later).
Companion: `docs/web-session-plan.md` (sessions and authentication, security-sensitive).

## Goal

Make the web app the only interface. Build register, login, logout, and profile
management in the browser. Only after that is working, remove the CLI (a separate
phase).

## Rendering convention

Every web page follows this path. New pages must not use static `.html` files.

1. **View function** in `src/views/<area>.ts`, named `render<Name>Page`. It takes plain
   data and returns an HTML string built with `renderPage(title, body)` from
   `src/views/layout.ts`. It does not read the request, touch the database, set cookies,
   or redirect.
2. **Router factory** in `src/routes/<area>.ts`, named `create<Area>Router`. It returns
   an `express.Router`. Route handlers read input, call services, call the render
   function, and send the result. They contain no HTML.
3. **Initialization** happens only in `src/app.ts`. Each factory is called there and
   mounted with `app.use`, inside the existing `// Begin route initializations` section,
   for example `app.use(createAuthRouter(deps))`. Route modules export factories only and
   never create or mount routers themselves.
4. All user-supplied values in a view go through `escapeHtml`.
5. CSRF tokens and any other per-request values are passed in as parameters. Views do
   not read `res.locals`.
6. Pages avoid inline scripts, so the CSP nonce is not needed for them. If a page ever
   needs a script, pass the nonce as a parameter.

Example:

```ts
// src/views/auth.ts
export function renderLoginPage(input: { csrfToken: string; error?: string }): string { ... }

// src/routes/auth.ts
export function createAuthRouter(deps: Dependencies): express.Router {
  const router = express.Router();
  router.get("/auth/login", (req, res) => {
    res.send(renderLoginPage({ csrfToken: ... }));
  });
  return router;
}
```

## Current state

- `src/app.ts`: serves `/health`, the static splash page, a 404 page, and the error
  handler. It has no form parsing, no routes beyond static files, no sessions, and no
  rate limiting. Two TODO comments mark the load shedder and rate limiter.
- `src/app.ts` mounts `src/views` as a static directory. Once `.ts` files live there,
  that mount would serve source files, so it must be removed when the pages move.
- `src/views/login.html`: placeholder, to be replaced by `renderLoginPage`.
- `src/views/index.html`: the splash page, served statically today.
- `src/views/layout.ts`: `renderPage` and `escapeHtml`. `renderAccountLink` links to
  `/account`, which the account routes below now serve.
- `src/lib/db/schema.ts`: `users` table with `id`, `name` (unique), `email` (unique),
  `phone_number` (unique), `password` (nullable hash). No session table.
- CLI features to port: register, login, list, password, email, phone, delete. Their
  validation rules live in `src/handlers/*.ts` and must be copied before those files
  are removed.
- `src/dependencies.ts` defines `maxRequestBodyBytes` (32 KB) and `trustedProxyHops`,
  which the web layer should use.

## Scope

In scope:

1. **Sessions and auth:** register, login, logout, with the design in
   `docs/web-session-plan.md`.
2. **Profile page** (signed-in user only): view own profile; change email; change
   phone; change password (current password required when one is set); delete profile
   (password required).
3. **Shared service layer:** the logic the CLI handlers contain, moved into `src/lib/`
   so the routes and tests can call it. No behavior change to the rules.
4. **Validation** copied from the CLI: username rules, password 12-128 characters,
   phone 10 digits, email format. Confirm the exact rules from `src/handlers/` before
   porting.
5. **Security controls:** CSRF token on every POST, login rate limiting, generic login
   errors, form body limit of `maxRequestBodyBytes`, and the existing CSP nonce and
   helmet settings kept as they are.
6. **Splash page on the convention:** move `index.html` to `renderIndexPage` in
   `src/views/index.ts`, with its route in `src/routes/home.ts`. Then `src/views` no
   longer needs to be served statically. Recommended so there is one rendering path.
7. **Tests** with the database mocked (per AGENTS), covering the service layer, the
   sessions, and the routes.

Out of scope for this plan:

- Reset as a web route. It is deferred and will need its own plan and approval, since
  it is destructive.
- Food inventory, recipes, meal planning, and nutrition (not implemented; no APIs
  assumed).
- Changes to the food items schema.

## Routes

| Method | Path | Router | Renders |
|---|---|---|---|
| GET | `/` | `createHomeRouter` | `renderIndexPage` |
| GET | `/auth/register` | `createAuthRouter` | `renderRegisterPage` |
| POST | `/auth/register` | `createAuthRouter` | redirect or `renderRegisterPage` with error |
| GET | `/auth/login` | `createAuthRouter` | `renderLoginPage` |
| POST | `/auth/login` | `createAuthRouter` | redirect or `renderLoginPage` with error |
| POST | `/auth/logout` | `createAuthRouter` | redirect |
| GET | `/account` | `createAccountRouter` | `renderAccountPage` |
| POST | `/account/email` | `createAccountRouter` | redirect or `renderAccountPage` with error |
| POST | `/account/phone` | `createAccountRouter` | redirect or `renderAccountPage` with error |
| POST | `/account/password` | `createAccountRouter` | redirect or `renderAccountPage` with error |
| POST | `/account/delete` | `createAccountRouter` | redirect |

## Files

| File | Change |
|---|---|
| `src/app.ts` | Add `express.urlencoded` with a limit of `maxRequestBodyBytes`, cookie parsing, session and CSRF middleware, login rate limiter. Initialize and mount `createHomeRouter(deps)`, `createAuthRouter(deps)`, and `createAccountRouter(deps)` inside the `// Begin route initializations` section. Remove the `express.static(viewsDir)` mount. Keep helmet, the nonce, the `/assets` static mount, the 404 page, and the error handler. |
| `src/routes/home.ts` (new) | `createHomeRouter`: `GET /`. |
| `src/routes/auth.ts` (new) | `createAuthRouter`: the `/auth/*` routes above. |
| `src/routes/account.ts` (new) | `createAccountRouter`: the `/account*` routes above. Each route resolves the session user; no user ID in URLs. |
| `src/views/auth.ts` (new) | `renderRegisterPage`, `renderLoginPage`. Replaces `src/views/login.html`. |
| `src/views/account.ts` (new) | `renderAccountPage` with forms for email, phone, password, and delete. |
| `src/views/index.ts` (new) | `renderIndexPage`. Replaces `src/views/index.html`. |
| `src/views/login.html`, `src/views/index.html` | Delete after their render functions are in place. Deletion is done by you, since it is outside the allowed delete path. |
| `src/views/layout.ts` | Nav shows Sign in or Sign out and keeps the existing link to `/account`. Keep `escapeHtml`. |
| `src/lib/auth/session.ts` (new) | Session token handling (see session plan). |
| `src/lib/auth/csrf.ts` (new) | Per-session CSRF token creation and checks. |
| `src/lib/auth/rateLimit.ts` (new) | Failed-login counters per username and per client IP. |
| `src/lib/auth/cookie.ts` (new) | Cookie parsing and setting for `kw_session`. |
| `src/lib/password.ts` (new) | `hashPassword` and `verifyPassword` (argon2), moved from `src/handlers/handlerPassword.ts`. A dummy hash for the unknown-user path. |
| `src/lib/users/service.ts` (new) | `createUser`, `setEmail`, `setPhone`, `setPassword`, `deleteUser`, and validators, built on `src/lib/db/queries/*`. |
| `src/lib/db/schema.ts` | Add the `sessions` table (see session plan). Export the `User` type, moved from `src/handlers/commandHandler.ts`. |
| `src/lib/db/migrations/*` | Generated only by `npm run generate`, reviewed, then applied with `npm run migrate`. Not hand-edited. Expected change: one new table. |
| `tests/*.test.ts` (new) | Services, sessions, CSRF, rate limit, view render output (escaping), and routes. Written through the test-writer subagent. Must not touch the real database or any config file. |
| `README.md` | Replace CLI setup and commands with web steps: open the site, register, sign in. |

`package.json` `build` copies `src/views/.` to `dist/views/`. With the convention, views
are compiled `.ts`, so that copy step can be removed once the HTML files are gone.
Confirm before changing `package.json` again.

## Order of work

1. Move password functions and validators into `src/lib/` with no behavior change. Add
   tests.
2. Add the `renderIndexPage` route and remove the static `src/views` mount. Check that
   `/` renders the same content. Delete `index.html` after that check.
3. Add the `sessions` table, generate the migration, review it, and apply it.
4. Add auth routes, session middleware, CSRF, and rate limiting, with
   `renderRegisterPage` and `renderLoginPage`.
5. Add profile routes and `renderAccountPage`. Update the nav in `layout.ts`.
6. Tests, `npm run typecheck`, `npm run build`, `npm test`, a `start:dev` smoke test
   (`/`, `/auth/register`, register, `/auth/login`, sign in, `/account`, sign out),
   then stop the server.
7. Phase 3 (remove the CLI) gets its own plan after this is verified.

## Migration impact

- New `sessions` table only. No existing column changes.
- The CLI does not touch sessions, so it keeps working until it is removed.
- Migrations are run by you against the dev database, after review. The `food_items`
  abort check should not apply, because this change does not touch that table. Confirm
  before running.

## Open questions

1. **Accounts without a password.** Accounts created through the CLI may have no
   password, and web login cannot verify them. Allowing a first web login to set a
   password would let anyone who knows a username take over that account.
   **Recommendation:** set passwords for all existing accounts through the CLI before
   the CLI is removed. Do not add a web "set password on first login" path.
2. **Profile list.** The CLI `list` shows every profile's email and phone. Showing that
   to every signed-in user is a privacy leak. **Recommendation:** do not port `list`,
   or show names only until there is a role model.
3. **Login errors.** Use one generic message for unknown user and wrong password, so
   usernames cannot be enumerated. **Recommendation:** yes.
4. **Validation rules.** Confirm the CLI rules (username, password length, phone format)
   carry over unchanged.
5. **Splash page.** Convert `index.html` to `renderIndexPage` now, as step 2.
   **Recommendation:** yes, so there is one rendering path from the start.

## Verification

- `npm run typecheck`, `npm run build`, `npm test`.
- `npm run start:dev` smoke test, then stop the server.
- `cleanup` subagent sweep after Phase 3 for leftover CLI references and stale HTML.
