# Web Session and Authentication Plan

Superseded by `docs/web-first-plan.md` (Part B). Decisions are recorded there.

Status: draft for review. Scope: Phase 0, decision 4. This area is security-sensitive:
no implementation until approved.
Companion: `docs/web-systems-plan.md` (routes, rendering convention, and file list).

## Current state

- There are no web sessions and no cookies. The CLI keeps the "current user" name in
  `src/kw.config.json` (`current_user_name`). That file is removed in Phase 3, so the
  web session replaces it.
- Passwords are hashed with argon2. The CLI password rule is 12-128 characters.
- `src/app.ts` uses helmet with a per-request CSP nonce, and `strictTransportSecurity`
  is off. The server binds to localhost over plain HTTP.

## Design

### Where session logic lives

Following the rendering convention in `docs/web-systems-plan.md`:

- Routes in `src/routes/auth.ts` and `src/routes/account.ts` read the cookie, call the
  session and CSRF helpers, set or clear the cookie, and redirect.
- Render functions in `src/views/auth.ts` and `src/views/account.ts` receive only data
  they need, such as `csrfToken` and an error message. They never read or set cookies,
  query the database, or check sessions.
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
- Expiry: 30 minutes idle and 12 hours absolute. Idle expiry is refreshed on each
  request. **Recommendation:** these values, as constants in `src/lib/auth/session.ts`.

### Cookie

- Name `kw_session`. Flags: `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure`.
- Modern browsers accept `Secure` cookies on `localhost` and `127.0.0.1` over HTTP.
  Check this in the browsers you use before relying on it.
- Parse the cookie header with a small internal function in `src/lib/auth/cookie.ts`.
  This avoids adding `cookie-parser` as a dependency. Ask first if you prefer the package.

### Login (`POST /auth/login`)

1. Rate-limit check (see below) before any database work.
2. Look up the user by username. If the user is missing, still run `verifyPassword`
   against a dummy argon2 hash so response time does not reveal which usernames exist.
3. On success, create a new session with a fresh token. Never reuse a token issued
   before login (session fixation). Set the cookie and redirect to `/account`.
4. On failure, re-render with `renderLoginPage` using one generic message for unknown
   user and wrong password.
5. Users with no password cannot sign in on the web (see the web systems plan, open
   question 1).
6. Log the event with `logEvent` (user ID, IP, outcome). Never log passwords, tokens, or
   the cookie value.

### Register (`POST /auth/register`)

- Validates username and password with the same rules as the CLI. Password is required
  at registration.
- Creates the session on success, so a new user is signed in right away. This is the
  same rotation as login.

### Logout (`POST /auth/logout`)

- Requires a valid CSRF token. Deletes the session row and clears the cookie.

### Password change (`POST /account/password`)

- Requires the current password when one is set.
- Deletes every session for that user, including the current one, then signs the user in
  again with a new session. This is simpler to reason about than keeping one session alive.

### Profile delete (`POST /account/delete`)

- Requires the password. The sessions cascade on delete. The cookie is cleared.

### CSRF

- Each session has a `csrf_token`. `renderLoginPage`, `renderRegisterPage`, and
  `renderAccountPage` take it as a parameter and render it as a hidden field.
- Every POST checks the token, in addition to `SameSite=Strict`.
- A missing or wrong token gets a 403 with a user-readable message.

### Rate limiting

- Failed logins are counted per username and per client IP. Client IP uses
  `trustedProxyHops` from `src/dependencies.ts`.
- **Recommendation:** after 5 failures in 15 minutes for a key, reject further attempts
  for that key until the window passes. Use a delay or a temporary block, not an account
  lockout, so an attacker cannot lock someone out of their own account.
- Counters are in memory. They reset when the server restarts, which is acceptable for
  a single localhost process. Note this in the README.

### Authorization

- Every profile route requires a session. Missing or expired sessions redirect to
  `/auth/login`.
- A user can only act on their own profile. No user ID appears in any URL.

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
| `src/app.ts` | Initialize cookie parsing, session middleware, rate limiting, and the auth and profile routers (`createAuthRouter(deps)`, `createAccountRouter(deps)`) inside the `// Begin route initializations` section. Route modules do not create or mount routers. |
| `src/routes/auth.ts`, `src/routes/account.ts` (new) | Session and CSRF handling as above. Render only through `src/views/*.ts`. |
| `src/views/auth.ts`, `src/views/account.ts` (new) | Render functions receive `csrfToken` and error text as parameters. No cookie, database, or session access. |
| `tests/*.test.ts` (new) | Through the test-writer: login success and failure, unknown-user timing path, session rotation, register sign-in, logout, idle and absolute expiry, CSRF rejection, cookie flags, rate limit, password change deletes sessions, profile delete clears cookie, and render output escapes user input. The database and config modules are mocked. |

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

## Open questions

1. **Session lifetime.** 30 minutes idle and 12 hours absolute. Confirm or change.
2. **Secure cookie over HTTP.** Confirm your browsers store `Secure` cookies on
   `127.0.0.1`. If not, drop `Secure` for local development only and keep it in
   production builds.
3. **Cookie parsing without a package.** Confirm the small internal parser is acceptable
   instead of adding `cookie-parser`.
4. **Rate limit values.** Confirm 5 failures in 15 minutes per key.

## Verification

- `npm test` for the new auth tests, `npm run typecheck`, `npm run build`.
- `npm run start:dev` smoke test: register, sign in, open `/account`, sign out, confirm
  `/account` redirects to `/auth/login`, then stop the server.
