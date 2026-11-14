import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";
import { readConfig } from "../../config.js";

const dbUrl = readConfig();
const conn = postgres(dbUrl);
export const db = drizzle(conn, { schema });
