import "dotenv/config";
import fs from 'fs';
import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

const filePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'src/kw.config.json');
const cfg = JSON.parse(fs.readFileSync( filePath, 'utf-8' ));
if (!cfg) throw new Error("No config found");

export default defineConfig({
  schema: "src/lib/db/schema.ts",
  out: "src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: cfg.db_url,
  },
});