import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";
import { readConfig } from "../../config.js";

const cfg = readConfig();
const conn = postgres(cfg.dbUrl);
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