import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "url";

config({ path: fileURLToPath(new URL("./src/.env", import.meta.url)) });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Missing required environment variable: DATABASE_URL");

export default defineConfig({
  schema: "src/lib/db/schema.ts",
  out: "src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
