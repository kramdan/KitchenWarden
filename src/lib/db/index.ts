import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

// Loaded from src/.env by src/env.ts, which must be imported before this module.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("Missing required environment variable: DATABASE_URL");
}

const conn = postgres(databaseUrl);
export const db = drizzle(conn, { schema });

export async function closeDb(): Promise<void> {
    await conn.end();
}

export type Db = typeof db;

// Returns the shared Postgres connection. Postgres enforces foreign keys by
// default, so no per-connection pragma is needed.
export function openDatabase(): Db {
  return db;
}