import "dotenv/config";

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const target = process.argv[2]?.trim();
if (!target) throw new Error("MAINTENANCE_SCRIPT_REQUIRED");

const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL?.trim();
const environment = process.env.APP_ENV?.trim() || "local";
if (!maintenanceUrl && (environment === "staging" || environment === "production")) {
  throw new Error("MAINTENANCE_DATABASE_URL_REQUIRED");
}

// Compatibilidad local antes de provisionar los dos roles. Nunca se permite
// este fallback en staging ni producción.
if (maintenanceUrl) process.env.DATABASE_URL = maintenanceUrl;

process.argv.splice(1, 1);
await import(pathToFileURL(resolve(process.cwd(), target)).href);
