# KitchenWarden Phase Plans

Status: draft for review. Covers the move from CLI and web to web only.

Detailed web design lives in `docs/web-first-plan.md` (Part A: web systems; Part B: sessions
and auth). Phase 2 below points there rather than repeating it.

## Ground rules

- Changes under `src/**` are applied directly, after a brief statement of what will change.
- Changes to any other file are approved as a whole plan before they are applied.
- The agent does not delete files. Deletions are done by you, except `*.tmp.md` files,
  which use `npm run clean:tmp`.
- The agent does not edit local config (`src/.env`, `src/kw.config.json`) or data files.
- Schema changes are made in the schema first, then generated with `npm run generate`,
  reviewed, and applied with `npm run migrate` by you.
- Database reset and user reset are destructive. They are not run without explicit approval.

## Phase 0: Decisions and first changes (complete)

Decisions recorded:

1. Build the web systems first, then remove the CLI.
2. Remove `src/kw.config.json`. Put `DATABASE_URL` in `src/.env` (real URL, local, not edited
   by the agent) and `src/.env.example` (placeholder).
3. Remove the `npm run reset` script. Keep the `src/dev` reset code, since reset may come
   back as a web route.
4. Sessions and auth follow `docs/web-first-plan.md` Part B.
5. Pages use the rendering convention in `docs/web-first-plan.md`: `render<Name>Page` in
   `src/views/<area>.ts`, and `create<Area>Router` in `src/routes/<area>.ts`, initialized in
   `src/app.ts`.
6. Account routes are `/account/*`, served by `createAccountRouter`.

Done:

- `src/.env.example`: `DATABASE_URL` placeholder added.
- `package.json`: `reset` script removed.
- `docs/web-systems-plan.md`, `docs/web-session-plan.md`, and `docs/web-first-plan.md` written.

Done by you:

- `DATABASE_URL=<real url>` added to `src/.env`.
- Config files removed after the database change.

## Phase 1: Database config and shared code (complete)

Goal: the app reads the database URL from `DATABASE_URL`, and the account rules the web will
need are in `src/lib/`, with no behavior change.

| File | Status |
|---|---|
| `src/lib/db/index.ts` | Done. Reads `DATABASE_URL`; throws a readable error if it is missing. |
| `drizzle.config.ts` (root) | Done. Reads `DATABASE_URL` from `src/.env`. Run by you with the config file moved aside. |
| `src/env.ts` (new) | Done. Loads `src/.env`; imported first by `main.ts` and `src/dev/index.ts`. |
| `src/dependencies.ts` | Done. `databasePath` reads `DATABASE_URL`. Kept as-is, by decision. |
| `src/lib/db/schema.ts` | Done. Exports `User`. |
| `src/lib/db/queries/*` | Done. Import `User` from `schema.ts`. |
| `src/lib/password.ts` (new) | Done. `hashPassword`, `verifyPassword`, `MAX_PASSWORD_LENGTH`. |
| `src/lib/services/accountServices.ts` (new) | Done. Account rules and `AccountError`. The CLI handlers keep their own copies until Phase 3. |
| `src/config.ts`, `src/lib/db/queries/getCurrentUser.ts` | Kept until Phase 3. The CLI still reads them; they no longer touch the database connection. |
| `.gitignore`, `.dockerignore` | Pending: remove the `kw.config.json` lines. Needs your approval (outside `src/`). |

Gate: passed. `npm run typecheck` passes. `npm run migrate` was run by you with the config
file moved aside. The config files were deleted by you.

The earlier typecheck errors in four query files are resolved; the typecheck run confirms it.

## Phase 2: Web features (complete)

Status: complete. Tests are deferred to the final sweep in Phase 5, once everything else is done.
Changes made during implementation are recorded in `docs/web-first-plan.md` (update block at the top).

Detailed in `docs/web-first-plan.md`, Part A "Order of work" and Part B. Summary:

1. Move the password functions and validators (Phase 1 covers the move; add tests).
2. Replace `index.html` with `renderIndexPage` on `GET /`. Remove the static `src/views`
   mount in `src/app.ts`. Delete `index.html` after checking the page renders the same.
3. Add the `sessions` table, generate the migration, review it, and apply it.
4. Add the auth routes (`/auth/register`, `/auth/login`, `/auth/logout`), session
   middleware, CSRF, and rate limiting, with `renderRegisterPage` and `renderLoginPage`.
5. Add the account routes (`/account`, `/account/email`, `/account/phone`,
   `/account/password`, `/account/delete`) with `renderAccountPage`. Update the nav in
   `src/views/layout.ts`.
6. Tests, typecheck, build, test run, and a `start:dev` smoke test. Then stop the server.

Step 1 decisions (recorded):

- Passwords are set at registration through the web app. CLI accounts without a password
  get one through the CLI before the CLI is removed.
- Account list is deprecated and not ported.
- Login error: "Username or password was incorrect" for unknown user and wrong password.
- Session lifetime: 60 minutes idle, 24 hours absolute.
- `kw_session` is set with `Secure`. Browser check on `127.0.0.1` is still to do.
- Rate limiter: 5 failures in 15 minutes per key (username and client IP), temporary block.
- Cache-busting approved: versioned asset URLs from a startup content hash, a long cache
  lifetime for versioned assets, and `Cache-Control: no-store` on auth and account pages.

Step 1 addendum (decided after the CLI rules review):

- Usernames: first and last name stored separately, lowercase, unique. Needs a schema change
  and a migration. Format rules and handling of existing accounts are open (see questions).
- Email and phone numbers: unique. A duplicate gets a readable message, not a database error.
- Legacy SHA-256 password hashes are not accepted.
- Cookie parsing: the `cookie-parser` package.

Usernames (decided): first and last name, each letters only (a-z), stored lowercase, unique
as a pair. Email is stored lowercase. Existing dev accounts are removed before the migration.

Migration status: `npm run generate` needs an interactive terminal (drizzle asks whether
`first_name` and `last_name` are renamed from `name`). Answer "create" for both and "delete"
for `name`, since the name is split rather than renamed. Review the generated SQL, then run
`npm run migrate` after the dev users are removed.

Gates:

- Migration: you review and apply it to the dev database. The `food_items` abort check should
  not apply because that table is not changed. Confirm before running.
- Open questions in `docs/web-first-plan.md` must be answered before step 4 (password-less
  accounts, account list privacy, validation rules, session lifetime, `Secure` cookies on
  `127.0.0.1`, cookie parsing without a package, rate limit values).

## Phase 3: Remove the CLI

Status: ready to start.

- Gate: met. The dev accounts are removed, so no account depends on a CLI-set password.
- Decision needed: remove `src/dev/index.ts` with the CLI (recommended). Keep `handlerReset.ts` and `usersdelete.ts`.
- Also remove `src/lib/db/queries/userslist.ts`, which only the CLI `list` command uses.
- Tests in `tests/` are replaced in the Phase 5 sweep, not in this phase.

Gate: Phase 2 verified, and every existing account can sign in on the web. Accounts created
through the CLI need a password set through the CLI first.

| File | Change |
|---|---|
| `src/cli.ts` | Delete (you). |
| `src/handlers/*.ts` (9 files: `commandHandler`, `commandsRegistry`, `handlerRegister`, `handlerLogin`, `handlerList`, `handlerEmail`, `handlerPhone`, `handlerPassword`, `handlerDelete`) | Delete (you), after their logic is in `src/lib/`. |
| `src/lib/prompt.ts`, `src/lib/promptText.ts` | Delete (you). |
| `src/lib/db/queries/getCurrentUser.ts` | Delete (you), once no code reads the CLI current user. |
| `src/dev/index.ts` | The CLI runner for `start:cli` and `reset`. Delete or keep (open question A). |
| `src/dev/handlerReset.ts`, `src/dev/usersdelete.ts` | Keep (decision 3). |
| `src/kw.config.example.json` | Delete after Phase 1. |
| `package.json` | Remove the `start:cli` script. Keep `start:dev`, `start:build`, `build`, `test`, `typecheck`, `generate`, `migrate`. |
| `tsconfig.build.json` | Keep the `./src/dev` exclude while `src/dev` remains. |
| `tests/` | Delete the 10 CLI and handler tests (you), or rewrite through the test-writer. Those files already import old flat paths like `../src/commandHandler.js`, so they do not load today. Keep `getCurrentUser.test.ts` only if its query stays. |

Open question A: decision 3 says to keep the reset code. `src/dev/index.ts` only exists to run
reset and the CLI. Recommendation: remove `src/dev/index.ts` with the CLI, and keep
`handlerReset.ts` and `usersdelete.ts` for the future web route. Confirm.

After this phase, `npm run start:cli -- reset` no longer runs unless `src/dev/index.ts` is kept.

## Phase 4: Docs and deployment (complete)

Status: README rewritten for web-only use, Dockerfile starts `dist/main.js` and creates the logs folder for the node user, and the build no longer copies the views folder. Docker run uses `--env-file src/.env`.

| File | Change |
|---|---|
| `README.md` | Replace CLI setup (steps 2-5) and the commands table with web steps: set `DATABASE_URL` in `src/.env`, run `npm run migrate`, open the site, register, sign in. Remove the `--no-web` Docker note. Replace the reset section with a note that reset is not available until it returns as a web route. Correct the claim that `start:dev` runs commands. Note that rate limits are in memory. |
| `Dockerfile` | Fix `CMD` from `dist/index.js` to `dist/main.js`. That file is never built, so the image does not start today. Pass `DATABASE_URL` at run time (`-e DATABASE_URL=...` or an env file). Do not bake it in. |
| `.dockerignore` | Keep `src/.env` excluded. Remove `**/kw.config.json` after the file is gone. |
| `AGENTS.md`, `.opencode/agents/code.md` | Not edited by the agent, since they are agent definitions. You update the CLI wording and the typecheck description. |
| `docs/kitchenwarden-rename-checklist.md`, `opencode.json` | No CLI references found. No change planned. |
| `package.json` `build` | After the HTML pages are gone, remove `cp -r src/views/. dist/views/` if no static files remain there. Confirm before changing. |

## Phase 5: Verification and cleanup

1. `npm run typecheck`, `npm run build`, `npm test`.
2. `npm run generate` should report no new migration after Phase 2 is applied.
3. `npm run start:dev` smoke test: `/`, `/auth/register`, register, `/auth/login`, sign in,
   `/account`, sign out, `/account` redirects to `/auth/login`. Then stop the server.
4. `npm run start:build` after `npm run build`: the same check on the built output.
5. `docker build` and `docker run` with the mounted environment, if Docker is used.
6. `cleanup` subagent sweep for leftover CLI references, stale HTML, and unused queries.
7. `security` subagent audit of the auth and account code. Read-only.
8. Confirm the Phase 2 security checks in `docs/web-first-plan.md`: cookie flags, no secrets
   in logs or pages, CSRF rejection, and no `src/views` exposure over HTTP.

## Known issues (not caused by this plan)

- `Dockerfile` runs `dist/index.js`, which is never built (fixed in Phase 4).
- The test files in `tests/` import old flat paths, so they do not load (Phase 3 or a
  rewrite).
- `README.md` says `start:dev` runs commands. It does not (fixed in Phase 4).
- `src/dependencies.ts` `requireENV` ignores the `env` argument passed to `initDependencies`
  and reads `process.env` directly. It only matters if a caller passes a custom env.
- `src/views/layout.ts` `renderAccountLink` points to `/account`. This is now served.

## Open questions (phase level)

A. Remove `src/dev/index.ts` with the CLI? Recommendation: yes (Phase 3).
B. Delete the old `docs/web-systems-plan.md` and `docs/web-session-plan.md` after
   `docs/web-first-plan.md` is the source of truth? You delete them, since the agent cannot.
   Recommendation: keep them until Phase 2 is done.
