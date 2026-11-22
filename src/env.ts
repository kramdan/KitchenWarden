import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Loads src/.env into process.env. Entry points import this module first, so the
// values exist before any module that reads them (such as the database) is evaluated.
config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });
