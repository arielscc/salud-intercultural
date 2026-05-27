import { spawnSync } from "node:child_process";
import { assertSafeDatabaseCommand } from "./database-safety.ts";

assertSafeDatabaseCommand({
  allowedDatabaseNames: ["salud_intercultural_test"],
  commandName: "pnpm test:db:reset",
  requireLocalHost: true
});

const result = spawnSync(
  "pnpm",
  ["exec", "prisma", "migrate", "reset", "--force"],
  {
    env: process.env,
    stdio: "inherit"
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
