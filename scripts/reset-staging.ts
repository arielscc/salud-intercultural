import { spawnSync } from "node:child_process";
import pg from "pg";
import { reportScriptError } from "./safe-error";
import { assertSafeStagingCommand } from "./staging-safety";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    env: process.env,
    stdio: "inherit"
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }
}

async function main() {
  assertSafeStagingCommand("staging:reset", { destructive: true });

  const connectionString = process.env.DATABASE_URL;
  const payloadSchema = process.env.PAYLOAD_DB_SCHEMA;

  if (!connectionString || !payloadSchema) {
    throw new Error("DATABASE_URL and PAYLOAD_DB_SCHEMA are required.");
  }

  if (!/^[a-z][a-z0-9_]*_staging$/i.test(payloadSchema)) {
    throw new Error("PAYLOAD_DB_SCHEMA must end in _staging before reset.");
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query(`DROP SCHEMA IF EXISTS "${payloadSchema}" CASCADE`);
    await client.query(`CREATE SCHEMA "${payloadSchema}"`);
  } finally {
    await client.end();
  }

  run("pnpm", ["exec", "prisma", "migrate", "reset", "--force", "--skip-seed"]);
  run("pnpm", ["staging:seed"]);

  console.log("Staging reset completed and synthetic QA data restored.");
}

main().catch((error) => {
  reportScriptError("Staging reset", error);
  process.exitCode = 1;
});
