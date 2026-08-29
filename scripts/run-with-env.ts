import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { config } from "dotenv";
import { reportScriptError } from "./safe-error";

/*
 * Corre un comando con las variables de otro archivo de entorno.
 *
 * Existe por `next dev`: a diferencia de los scripts, Next solo lee `.env` y
 * `.env.local` y no acepta DOTENV_CONFIG_PATH. Sin esto no hay forma de
 * levantar un segundo entorno local sin sobrescribir el `.env` con el que se
 * trabaja todos los días, que es justamente lo que no se debe tocar.
 *
 * Las variables se cargan al proceso antes de lanzar el comando. Next respeta
 * lo que ya viene en el entorno y no lo pisa con su propio `.env`.
 *
 * Uso:
 *   ENV_FILE=.env.piloto node --import tsx scripts/run-with-env.ts next dev -p 3001
 */
const envFile = process.env.ENV_FILE?.trim();
const command = process.argv.slice(2);

if (!envFile) {
  reportScriptError("run-with-env", new Error("ENV_FILE is required."));
  process.exit(1);
}

if (!existsSync(envFile)) {
  reportScriptError("run-with-env", new Error(`Env file "${envFile}" does not exist.`));
  process.exit(1);
}

if (command.length === 0) {
  reportScriptError("run-with-env", new Error("A command to run is required."));
  process.exit(1);
}

// `override` deja ganar al archivo pedido sobre lo que ya traiga la terminal;
// si no, una variable heredada del entorno de todos los días se colaría aquí.
const loaded = config({ path: envFile, override: true, quiet: true });

if (loaded.error) {
  reportScriptError("run-with-env", loaded.error);
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", ...command], {
  stdio: "inherit",
  env: process.env
});

process.exit(result.status ?? 1);
