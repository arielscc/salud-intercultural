import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertEnvironmentIsolation } from "../src/lib/deployment-environment";
import { reportScriptError } from "./safe-error";

/*
 * Sincroniza `.env.staging` con las variables de Vercel de la rama `staging`.
 *
 *   pnpm staging:sync-vercel             empuja y verifica
 *   pnpm staging:sync-vercel --dry-run   muestra qué haría, sin escribir
 *
 * Existe porque `.env.staging` y Vercel eran dos fuentes de verdad separadas y
 * nada las comparaba: `pnpm staging:check` validaba el archivo local mientras el
 * deploy fallaba con otros valores. El error solo aparecía dentro del build, que
 * es el último momento posible para enterarse.
 *
 * Las variables van acotadas a la rama `staging`. Preview cubre todas las ramas,
 * y una preview de `develop` deduce entorno `test`: si heredara `APP_ENV=staging`
 * chocaría con esa deducción y ningún preview de develop volvería a compilar.
 */

const envFile = ".env.staging";
const branch = "staging";

/** Variables que el contrato de aislamiento lee en staging. */
const synced = [
  { name: "APP_ENV", sensitive: false },
  { name: "NEXT_PUBLIC_APP_ENV", sensitive: false },
  { name: "DATABASE_ENVIRONMENT", sensitive: false },
  { name: "STORAGE_ENVIRONMENT", sensitive: false },
  { name: "EXTERNAL_COMMUNICATIONS_MODE", sensitive: false },
  { name: "NEXT_PUBLIC_SITE_URL", sensitive: false },
  { name: "PAYLOAD_PUBLIC_SERVER_URL", sensitive: false },
  { name: "PAYLOAD_DB_SCHEMA", sensitive: false },
  { name: "CMS_READS_DURING_BUILD", sensitive: false },
  { name: "DATABASE_URL", sensitive: true },
  { name: "PAYLOAD_SECRET", sensitive: true },
  { name: "PAYLOAD_SIGECO_INTEGRATION_SECRET", sensitive: true },
  { name: "STAGING_BLOB_READ_WRITE_TOKEN", sensitive: true },
  { name: "STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN", sensitive: true }
] as const;

/** Analítica de producción: staging la rechaza si llega con valor. */
const forbidden = [
  "NEXT_PUBLIC_GA_ID",
  "NEXT_PUBLIC_META_PIXEL_ID",
  "GOOGLE_SITE_VERIFICATION"
];

/** Marcadores que jamás deben alcanzar a otra rama que no sea `staging`. */
const stagingMarkers = [
  "APP_ENV",
  "NEXT_PUBLIC_APP_ENV",
  "DATABASE_ENVIRONMENT",
  "STORAGE_ENVIRONMENT",
  "EXTERNAL_COMMUNICATIONS_MODE"
];

const dryRun = process.argv.includes("--dry-run");

function vercel(args: string[], input?: string) {
  return execFileSync("vercel", args, {
    encoding: "utf8",
    input,
    maxBuffer: 32 * 1024 * 1024
  }).trim();
}

function requireVercel() {
  try {
    vercel(["whoami"]);
  } catch {
    throw new Error(
      "vercel no está instalado o no hay sesión. Ejecuta: vercel login"
    );
  }
}

function parseEnvFile(path: string) {
  const values: Record<string, string> = {};

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    const [, name, rawValue] = match;
    const unquoted = /^"(.*)"$|^'(.*)'$/.exec(rawValue.trim());
    values[name] = (unquoted?.[1] ?? unquoted?.[2] ?? rawValue).trim();
  }

  return values;
}

/**
 * Descarga lo que Vercel resuelve para una rama. Las variables marcadas como
 * Sensitive vuelven vacías —Vercel no las devuelve— así que solo sirve para
 * comparar las que no lo son y para detectar fugas de scope entre ramas.
 */
function pullResolved(gitBranch: string) {
  const directory = mkdtempSync(join(tmpdir(), "vercel-env-"));
  const file = join(directory, ".env");

  try {
    vercel([
      "env",
      "pull",
      "--environment=preview",
      `--git-branch=${gitBranch}`,
      file,
      "--yes"
    ]);
    return parseEnvFile(file);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Valida el archivo local imitando el build de Vercel: mismas variables, más los
 * marcadores que hacen que `resolveDeploymentEnvironment` deduzca staging. Si el
 * archivo no pasa, no tiene sentido empujarlo.
 */
function validateLocalFile(values: Record<string, string>) {
  const summary = assertEnvironmentIsolation({
    ...values,
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: branch
  });

  if (summary.environment !== "staging") {
    throw new Error(
      `${envFile} describe el entorno "${summary.environment}", no staging.`
    );
  }
}

function push(name: string, value: string, sensitive: boolean) {
  // El valor va por stdin: como argumento quedaría visible en la lista de
  // procesos de la máquina mientras dura la llamada.
  vercel(
    [
      "env",
      "add",
      name,
      "preview",
      "--git-branch",
      branch,
      sensitive ? "--sensitive" : "--no-sensitive",
      "--force",
      "--yes"
    ],
    value
  );
}

function main() {
  requireVercel();

  const local = parseEnvFile(envFile);
  const missing = synced
    .filter(({ name }) => !local[name])
    .map(({ name }) => name);

  if (missing.length > 0) {
    throw new Error(`Faltan en ${envFile}: ${missing.join(", ")}`);
  }

  validateLocalFile(local);
  console.log(`${envFile} pasa el contrato de aislamiento de staging.`);

  const withValue = forbidden.filter((name) => local[name]);
  if (withValue.length > 0) {
    throw new Error(
      `Staging no admite analítica de producción. Vacía en ${envFile}: ${withValue.join(", ")}`
    );
  }

  if (dryRun) {
    console.log(`\nEmpujaría a Preview (rama ${branch}):`);
    for (const { name, sensitive } of synced) {
      console.log(`  ${name}${sensitive ? "  [sensible]" : ""}`);
    }
    console.log("\nSin cambios: --dry-run.");
    return;
  }

  console.log(`\nEmpujando ${synced.length} variables a Preview (rama ${branch})…`);
  for (const { name, sensitive } of synced) {
    push(name, local[name], sensitive);
    console.log(`  ${name}`);
  }

  console.log("\nVerificando lo que Vercel resuelve…");
  const resolved = pullResolved(branch);
  const drifted = synced
    .filter(({ name, sensitive }) => !sensitive && resolved[name] !== local[name])
    .map(({ name }) => name);

  if (drifted.length > 0) {
    throw new Error(
      `Vercel devuelve otro valor para: ${drifted.join(", ")}. Revísalas en el panel.`
    );
  }

  const analytics = forbidden.filter((name) => resolved[name]);
  if (analytics.length > 0) {
    throw new Error(
      `Vercel todavía tiene analítica en la rama ${branch}: ${analytics.join(", ")}. ` +
        "Bórralas desde el panel: este script no elimina variables."
    );
  }

  // Las sensibles vuelven vacías del pull, así que la única prueba real de que
  // llegaron es que estén declaradas para esta rama.
  const scoped = vercel(["env", "ls", "preview"]);
  const unscoped = synced
    .filter(({ name }) => !new RegExp(`^\\s*${name}\\s+.*\\(${branch}\\)`, "m").test(scoped))
    .map(({ name }) => name);

  if (unscoped.length > 0) {
    throw new Error(
      `Sin acotar a la rama ${branch}: ${unscoped.join(", ")}. Revísalas en el panel.`
    );
  }

  const develop = pullResolved("develop");
  const leaked = stagingMarkers.filter((name) => develop[name]);

  if (leaked.length > 0) {
    throw new Error(
      `Estas alcanzan a la rama develop y romperán sus previews: ${leaked.join(", ")}.`
    );
  }

  console.log("Verificado: acotadas a staging, sin analítica y sin fugas a develop.");
  console.log("\nVercel no reconstruye al cambiar variables. Redespliega para aplicarlas:");
  console.log("  vercel redeploy <url-del-deploy-de-staging>");
}

try {
  main();
} catch (error) {
  // Este script maneja tokens y cadenas de conexión: solo se imprimen los
  // mensajes propios, que hablan de nombres de variables y nunca de valores.
  if (error instanceof Error && /^[^\n]*$/.test(error.message) && !/=/.test(error.message)) {
    console.error(error.message);
  } else {
    reportScriptError("sync-vercel-staging-env", error);
  }
  process.exitCode = 1;
}
