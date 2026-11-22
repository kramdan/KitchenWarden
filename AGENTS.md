# KitchenWarden

KitchenWarden is a local-first kitchen inventory and meal-planning project.

- The web app: an Express server that serves server-rendered pages for sign-up,
  login, and account management. It uses an ORM over a local PostgreSQL database.
- The schema: the database schema definition. It is the contract for the app's
  data.
- Dev tooling: local-only scripts and docs.

Current state: web accounts (sign-up, login, sessions, and account editing) exist.
The command-line tool has been removed. Food inventory, recipes, meal planning,
and nutrition features are planned but not implemented. Do not assume APIs for
them exist.

## Verification

Run commands from the repository root.

- Start the server with `npm run start:dev` to run it.
- Type-check the codebase before finishing a change to it.
- Database reset and user reset are destructive. Do not run them without
  explicit approval. The reset code in `src/dev` has no npm script and no route.

There is no lint or formatter. `npm test` runs the Node test runner (built-in
`node:test`, no added dependencies) over `tests/*.test.ts`. Tests must not touch
the dev database or the local environment file (`src/.env`); mock those modules.
Do not add other tooling without asking.

## Toolchain

Use the installed versions of the runtime, TypeScript, and the database tooling.
Assume they are correct. Do not downgrade, re-pin, or suggest an upgrade as part
of an unrelated change.

## Setup

- Install dependencies at the repository root.
- Copy `src/.env.example` to `src/.env`. That file is gitignored and holds local
  settings: `DATABASE_URL` and `DOWNLOAD_SIGNING_KEY`. `src/env.ts` loads it, and
  the entry points import it first.
- Environment variables set in the shell take precedence over `src/.env`.
- Docker: run `npm run build`, then `docker build -t kitchenwarden .`. The image
  runs `dist/main.js`. Pass the settings at run time with
  `docker run --env-file src/.env`. Never bake `src/.env` into the image.

## Data and migrations

- Change the schema first; it is the contract for the app's data.
- Generate migrations from the schema, review the generated migration, then
  apply it.
- A generated migration aborts if the food items table holds rows, because each
  row must be assigned a user ID before the non-null constraint can apply. Say so
  before running it against a populated dev database.
- Never hand-edit generated migrations, their snapshots or metadata, or build
  output.
- Use the built-in crypto source for IDs, as the existing ID helper does.

## Conventions

- TypeScript is strict. Match the style of the file you are editing.
- Code follows ES module conventions: relative imports include the `.js`
  extension.
- Store dates as ISO `YYYY-MM-DD` text. Let the ORM handle timestamps with the
  database's built-in unix-epoch default.
- Error messages should be user-readable.
- Views are render functions in `src/views/<area>.ts`. Routes are factories in
  `src/routes/<area>.ts`, mounted only from `src/app.ts`. Views never read the
  request, the database, or cookies.

## Boundaries

- Do not read dependency folders, build output, data folders, the local
  environment file, or other environment files without a specific reason. Ask
  before reading environment files. Read the lockfile only when diagnosing a
  dependency change.
- Do not edit agent definitions, generated migrations, lockfiles, local config or
  data files, or binary assets unless the task requires it.
- No network calls, telemetry, analytics, remote assets, or backend beyond the localhost-only Express server in `src/main.ts` (started by `npm run start:dev`, or `npm run start:build` after build). Local-first
  is a product constraint, not an implementation detail.
- Do not run database reset or user reset without explicit approval. Do not leave
  dev servers running.
- Keep environments isolated. Do not change database names without discussing
  the migration impact.
- Treat session and account handling (`src/lib/auth`, `src/routes/auth.ts`,
  `src/routes/account.ts`) as security-sensitive. Ask before changing their
  behavior.

## Working style

- Locate first with search tools, then read only the matching ranges. Batch
  independent searches and reads in one step. Do not read whole directories to
  "get context".
- Keep changes minimal and consistent. Do not refactor adjacent code.
- Verify with the narrowest check: the type-check for code changes.
- If the schema changes, generate migrations and call out the impact on the
  running app.
- Report the files changed, the commands run with their results, and any
  follow-up. Be concise; do not restate full files or diffs.
- If approaches differ materially, recommend one and ask once. Otherwise
  proceed.
