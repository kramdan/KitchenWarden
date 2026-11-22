# Web-First Plan (Combined)

Status: draft for review. Combines `docs/web-systems-plan.md` and
`docs/web-session-plan.md`. Those two files remain as the source; if they change, update
this file too.

Scope: Phase 0 of moving KitchenWarden from CLI and web to web only.

## Phase 0 decisions (recorded)

1. Build the web systems first, then remove the CLI.
2. Remove `src/kw.config.json`. Put `DATABASE_URL` in `src/.env` (local, real URL) and
   `src/.env.example` (placeholder). The database code change must land before the config
   file is removed.
3. Remove the `npm run reset` script. Keep the `src/dev` reset code, since it may come
   back as a web route.
4. Sessions and auth follow the same plan as decision 1, in its own document.

Rendering, route layout, and URL paths in this plan were settled after Phase 0 and are
recorded below.

---

# Part A: Web Systems

## Goal

Make the web app the only interface. Build register, login, logout, and account
management in the browser. Only after that is working, remove the CLI (a separate phase).

## Rendering convention

Every web page follows this path. New pages must not use static `.html` files.

1. **View function** in `src/views/<area>.ts`, named `render<Name>Page`. It takes plain
   data and returns an HTML string built with `renderPage(title, body)` from
   `src/views/layout.ts`. It does not read the request, touch the database, set cookies,
   or redirect.
2. **Router factory** in `src/routes/<area>.ts`, named `create<Area>Router`. It returns an
   `express.Router`. Route handlers read input, call services, call the render function,
   and send the result. They contain no HTML.
3. **Initialization** happens only in `src/app.ts`. Each factory is called there and
   mounted with `app.use`, inside the existing `// Begin route initializations` section,
   for example `app.use(createAuthRouter(deps))`. Route modules export factories only and
   never create or mount routers themselves.
4. All user-supplied values in a view go through `escapeHtml`.
5. CSRF tokens and any other per-request values are passed in as parameters. Views do not
   read `res.locals`.
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
  handler. It has no form parsing, no routes beyond static files, no sessions, and no rate
  limiting. Two TODO comments mark the load shedder and rate limiter.
- `src/app.ts` mounts `src/views` as a static directory. Once `.ts` files live there, that
  mount would serve source files, so it must be removed when the pages move.
- `src/views/login.html`: placeholder, to be replaced by `renderLoginPage`.
- `src/views/index.html`: the splash page, served statically today.
- `src/views/layout.ts`: `renderPage` and `escapeHtml`. `renderAccountLink` links to
  `/account`, which the account routes below now serve.
- `src/lib/db/schema.ts`: `users` table with `id`, `name` (unique), `email` (unique),
  `phone_number` (unique), `password` (nullable hash). No session table.
- CLI features to port: register, login, list, password, email, phone, delete. Their
  validation rules live in `src/handlers/*.ts` and must be copied before those files are
  removed.
- `src/dependencies.ts` defines `maxRequestBodyBytes` (32 KB) and `trustedProxyHops`,
  which the web layer should use.

## Scope

In scope:

1. **Sessions and auth:** register, login, logout, with the design in Part B.
2. **Account page** (signed-in user only): view own account; change email; change phone;
   change password (current password required when one is set); delete account (password
   required).
3. **Shared service layer:** the logic the CLI handlers contain, moved into `src/lib/` so
   the routes and tests can call it. No behavior change to the rules.
4. **Validation** copied from the CLI: username rules, password 12-128 characters, phone
   10 digits, email format. Confirm the exact rules from `src/handlers/` before porting.
5. **Security controls:** CSRF token on every POST, login rate limiting, generic login
   errors, form body limit of `maxRequestBodyBytes`, and the existing CSP nonce and helmet
   settings kept as they are.
6. **Splash page on the convention:** move `index.html` to `renderIndexPage` in
   `src/views/index.ts`, with its route in `src/routes/home.ts`. Then `src/views` no longer
   needs to be served statically. Recommended so there is one rendering path.
7. **Tests** with the database mocked (per AGENTS), covering the service layer, the
   sessions, and the routes.

Out of scope for this plan:

- Reset as a web route. It is deferred and will need its own plan and approval, since it
  is destructive.
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
| `src/lib/auth/session.ts` (new) | Session token handling (Part B). |
| `src/lib/auth/csrf.ts` (new) | Per-session CSRF token creation and checks. |
| `src/lib/auth/rateLimit.ts` (new) | Failed-login counters per username and per client IP. |
| `src/lib/auth/cookie.ts` (new) | Cookie parsing and setting for `kw_session`. |
| `src/lib/password.ts` (new) | `hashPassword` and `verifyPassword` (argon2), moved from `src/handlers/handlerPassword.ts`. A dummy hash for the unknown-user path. |
| `src/lib/users/service.ts` (new) | `createUser`, `setEmail`, `setPhone`, `setPassword`, `deleteUser`, and validators, built on `src/lib/db/queries/*`. |
| `src/lib/db/schema.ts` | Add the `sessions` table (Part B). Export the `User` type, moved from `src/handlers/commandHandler.ts`. |
| `src/lib/db/migrations/*` | Generated only by `npm run generate`, reviewed, then applied with `npm run migrate`. Not hand-edited. Expected change: one new table. |
| `tests/*.test.ts` (new) | Services, sessions, CSRF, rate limit, view render output (escaping), and routes. Written through the test-writer subagent. Must not touch the real database or any config file. |
| `README.md` | Replace CLI setup and commands with web steps: open the site, register, sign in. |

`package.json` `build` copies `src/views/.` to `dist/views/`. With the convention, views are
compiled `.ts`, so that copy step can be removed once the HTML files are gone. Confirm
before changing `package.json` again.

## Order of work

1. Move password functions and validators into `src/lib/` with no behavior change. Add
   tests.
2. Add the `renderIndexPage` route and remove the static `src/views` mount. Check that `/`
   renders the same content. Delete `index.html` after that check.
3. Add the `sessions` table, generate the migration, review it, and apply it.
4. Add auth routes, session middleware, CSRF, and rate limiting, with `renderRegisterPage`
   and `renderLoginPage`.
5. Add account routes and `renderAccountPage`. Update the nav in `layout.ts`.
6. Tests, `npm run typecheck`, `npm run build`, `npm test`, a `start:dev` smoke test (`/`,
   `/auth/register`, register, `/auth/login`, sign in, `/account`, sign out), then stop the
   server.
7. Phase 3 (remove the CLI) gets its own plan after this is verified.

## Migration impact

- New `sessions` table only. No existing column changes.
- The CLI does not touch sessions, so it keeps working until it is removed.
- Migrations are run by you against the dev database, after review. The `food_items`
  abort check should not apply, because this change does not touch that table. Confirm
  before running.

## Open questions (Part A)

1. **Accounts without a password.** Accounts created through the CLI may have no password,
   and web login cannot verify them. Allowing a first web login to set a password would let
   anyone who knows a username take over that account. **Recommendation:** set passwords
   for all existing accounts through the CLI before the CLI is removed. Do not add a web
   "set password on first login" path.
2. **Account list.** The CLI `list` shows every profile's email and phone. Showing that to
   every signed-in user is a privacy leak. **Recommendation:** do not port `list`, or show
   names only until there is a role model.
3. **Login errors.** Use one generic message for unknown user and wrong password, so
   usernames cannot be enumerated. **Recommendation:** yes.
4. **Validation rules.** Confirm the CLI rules (username, password length, phone format)
   carry over unchanged.
5. **Splash page.** Convert `index.html` to `renderIndexPage` now, as step 2.
   **Recommendation:** yes, so there is one rendering path from the start.
6. **Naming.** Resolved: the view file is `src/views/account.ts` and the function is
   `renderAccountPage`, matching `createAccountRouter` and `src/routes/account.ts`.

## Verification (Part A)

- `npm run typecheck`, `npm run build`, `npm test`.
- `npm run start:dev` smoke test, then stop the server.
- `cleanup` subagent sweep after Phase 3 for leftover CLI references and stale HTML.

---

# Part B: Web Session and Authentication

Status: draft for review. This area is security-sensitive: no implementation until
approved. Companion to Part A (routes, rendering convention, and file list).

## Current state

- There are no web sessions and no cookies. The CLI keeps the "current user" name in
  `src/kw.config.json` (`current_user_name`). That file is removed in Phase 3, so the web
  session replaces it.
- Passwords are hashed with argon2. The CLI password rule is 12-128 characters.
- `src/app.ts` uses helmet with a per-request CSP nonce, and `strictTransportSecurity` is
  off. The server binds to localhost over plain HTTP.

## Design

### Where session logic lives

Following the rendering convention in Part A:

- Routes in `src/routes/auth.ts` and `src/routes/account.ts` read the cookie, call the
  session and CSRF helpers, set or clear the cookie, and redirect.
- Render functions in `src/views/auth.ts` and `src/views/account.ts` receive only data they
  need, such as `csrfToken` and an error message. They never read or set cookies, query the
  database, or check sessions.
- Session middleware in `src/app.ts` resolves the cookie to a user and attaches it to
  `res.locals` for routes. Only routes read `res.locals`; views do not.

### Server-side sessions

- The browser holds a random token. The server stores only a SHA-256 hash of it, so a
  leaked database does not yield live sessions. Token generation uses `crypto.randomBytes`,
  consistent with the existing ID helper.
- New `sessions` table (Drizzle, `pg-core`), following the `users` table style:
  - `token_hash` text, primary key
  - `user_id` uuid, not null, references `users.id` on delete cascade
  - `csrf_token` text, not null
  - `created_at` timestamp, default now
  - `last_seen_at` timestamp, default now
  - `expires_at` timestamp, not null
- Expiry: 30 minutes idle and 12 hours absolute. Idle expiry is refreshed on each request.
  **Recommendation:** these values, as constants in `src/lib/auth/session.ts`.

### Cookie

- Name `kw_session`. Flags: `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure`.
- Modern browsers accept `Secure` cookies on `localhost` and `127.0.0.1` over HTTP. Check
  this in the browsers you use before relying on it.
- Parse the cookie header with a small internal function in `src/lib/auth/cookie.ts`. This
  avoids adding `cookie-parser` as a dependency. Ask first if you prefer the package.

### Login (`POST /auth/login`)

1. Rate-limit check (see below) before any database work.
2. Look up the user by username. If the user is missing, still run `verifyPassword` against
   a dummy argon2 hash so response time does not reveal which usernames exist.
3. On success, create a new session with a fresh token. Never reuse a token issued before
   login (session fixation). Set the cookie and redirect to `/account`.
4. On failure, re-render with `renderLoginPage` using one generic message for unknown user
   and wrong password.
5. Users with no password cannot sign in on the web (see Part A, open question 1).
6. Log the event with `logEvent` (user ID, IP, outcome). Never log passwords, tokens, or the
   cookie value.

### Register (`POST /auth/register`)

- Validates username and password with the same rules as the CLI. Password is required at
  registration.
- Creates the session on success, so a new user is signed in right away. This is the same
  rotation as login.

### Logout (`POST /auth/logout`)

- Requires a valid CSRF token. Deletes the session row and clears the cookie.

### Password change (`POST /account/password`)

- Requires the current password when one is set.
- Deletes every session for that user, including the current one, then signs the user in
  again with a new session. This is simpler to reason about than keeping one session alive.

### Account delete (`POST /account/delete`)

- Requires the password. The sessions cascade on delete. The cookie is cleared.

### CSRF

- Each session has a `csrf_token`. `renderLoginPage`, `renderRegisterPage`, and
  `renderAccountPage` take it as a parameter and render it as a hidden field.
- Every POST checks the token, in addition to `SameSite=Strict`.
- A missing or wrong token gets a 403 with a user-readable message.

### Rate limiting

- Failed logins are counted per username and per client IP. Client IP uses
  `trustedProxyHops` from `src/dependencies.ts`.
- **Recommendation:** after 5 failures in 15 minutes for a key, reject further attempts for
  that key until the window passes. Use a delay or a temporary block, not an account
  lockout, so an attacker cannot lock someone out of their own account.
- Counters are in memory. They reset when the server restarts, which is acceptable for a
  single localhost process. Note this in the README.

### Authorization

- Every account route requires a session. Missing or expired sessions redirect to
  `/auth/login`.
- A user can only act on their own account. No user ID appears in any URL.

### Housekeeping

- Delete expired session rows on each successful login. The table stays small without a
  background job.

## Routes and views touched

| Route | Session behavior | Render function |
|---|---|---|
| `GET /auth/login` | Signed-in users redirect to `/account` | `renderLoginPage({ csrfToken, error? })` |
| `POST /auth/login` | Creates session on success | `renderLoginPage` on failure |
| `GET /auth/register` | Signed-in users redirect to `/account` | `renderRegisterPage({ csrfToken, error? })` |
| `POST /auth/register` | Creates session on success | `renderRegisterPage` on failure |
| `POST /auth/logout` | Destroys session | none (redirect) |
| `GET /account` | Requires session | `renderProfilePage({ user, csrfToken, error? })` |
| `POST /account/email`, `/account/phone` | Requires session and CSRF | `renderAccountPage` on failure |
| `POST /account/password` | Requires session and CSRF; rotates session | `renderAccountPage` on failure |
| `POST /account/delete` | Requires session, CSRF, and password | none (redirect) |

## Files

| File | Change |
|---|---|
| `src/lib/db/schema.ts` | Add `sessions` table. |
| `src/lib/db/migrations/*` | Generated by `npm run generate`, reviewed, applied with `npm run migrate`. Not hand-edited. |
| `src/lib/auth/session.ts` (new) | Token create, hash, look up, refresh, rotate, destroy, expire. |
| `src/lib/auth/csrf.ts` (new) | Issue and check CSRF tokens tied to the session. |
| `src/lib/auth/rateLimit.ts` (new) | In-memory failure counters with a window. |
| `src/lib/auth/cookie.ts` (new) | Parse the cookie header; set and clear `kw_session`. |
| `src/lib/password.ts` (new) | argon2 helpers, moved from the CLI handler; dummy hash for the unknown-user path. |
| `src/app.ts` | Initialize cookie parsing, session middleware, rate limiting, and the auth and account routers (`createAuthRouter(deps)`, `createAccountRouter(deps)`) inside the `// Begin route initializations` section. Route modules do not create or mount routers. |
| `src/routes/auth.ts`, `src/routes/account.ts` (new) | Session and CSRF handling as above. Render only through `src/views/*.ts`. |
| `src/views/auth.ts`, `src/views/account.ts` (new) | Render functions receive `csrfToken` and error text as parameters. No cookie, database, or session access. |
| `tests/*.test.ts` (new) | Through the test-writer: login success and failure, unknown-user timing path, session rotation, register sign-in, logout, idle and absolute expiry, CSRF rejection, cookie flags, rate limit, password change deletes sessions, account delete clears cookie, and render output escapes user input. The database and config modules are mocked. |

## Security checks before merge

- Cookie flags checked in browser devtools.
- No token, password, or hash appears in logs, rendered HTML, or error pages.
- Error pages do not reveal stack traces. The existing `errorHandler` logs the stack
  server-side only; confirm that stays true.
- A signed-out request to `/account` redirects to `/auth/login`.
- A POST without the CSRF token returns 403.
- The `src/views` directory is not reachable over HTTP (no static mount).

## Migration impact

- New `sessions` table. `users` is unchanged. The CLI does not read sessions.
- The migration is applied to the dev database by you, after review.

## Open questions (Part B)

1. **Session lifetime.** 30 minutes idle and 12 hours absolute. Confirm or change.
2. **Secure cookie over HTTP.** Confirm your browsers store `Secure` cookies on `127.0.0.1`.
   If not, drop `Secure` for local development only and keep it in production builds.
3. **Cookie parsing without a package.** Confirm the small internal parser is acceptable
   instead of adding `cookie-parser`.
4. **Rate limit values.** Confirm 5 failures in 15 minutes per key.

## Verification (Part B)

- `npm test` for the new auth tests, `npm run typecheck`, `npm run build`.
- `npm run start:dev` smoke test: register, sign in, open `/account`, sign out, confirm
  `/account` redirects to `/auth/login`, then stop the server.
