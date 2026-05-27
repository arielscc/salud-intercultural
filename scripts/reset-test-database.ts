import { spawnSync } from "node:child_process";

const expectedDatabase = "salud_intercultural_test";
const allowedHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Copy .env.test.example to .env.test first.");
  }

  return databaseUrl;
}

function assertTestDatabase(databaseUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }

  const databaseName = parsed.pathname.replace(/^\//, "");

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error(
      `Refusing to reset a non-local database host (${parsed.hostname}). Use localhost for test DB resets.`
    );
  }

  if (databaseName !== expectedDatabase) {
    throw new Error(
      `Refusing to reset database "${databaseName}". Expected "${expectedDatabase}".`
    );
  }
}

const databaseUrl = getDatabaseUrl();
assertTestDatabase(databaseUrl);

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
