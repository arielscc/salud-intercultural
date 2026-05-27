import { spawnSync } from "node:child_process";
import { assertSafeDatabaseCommand } from "./database-safety.ts";

assertSafeDatabaseCommand({
  allowedDatabaseNames: ["salud_intercultural_dev", "salud_intercultural_test"],
  allowRemoteOverrideEnv: "ALLOW_REMOTE_DB_RESET",
  commandName: "pnpm db:reset",
  requireLocalHost: true
});

const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "reset"], {
  env: process.env,
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
