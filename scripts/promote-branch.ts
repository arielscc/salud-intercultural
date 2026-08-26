import { execFileSync } from "node:child_process";
import { reportScriptError } from "./safe-error";

/*
 * Promueve una rama a la siguiente del flujo, por Pull Request y con auto-merge.
 *
 *   pnpm promote:staging   develop -> staging
 *   pnpm promote:main      staging -> main
 *
 * El PR es el candado: `staging` y `main` están protegidas y GitHub no fusiona
 * mientras los cinco checks del CI no terminen en verde. Con auto-merge no hay
 * que esperar mirando la pantalla.
 *
 * Agrega `--dry-run` para ver qué haría sin crear nada.
 */

const flow: Record<string, { head: string; title: string }> = {
  staging: { head: "develop", title: "Promover a staging" },
  main: { head: "staging", title: "Promover a producción" }
};

function gh(args: string[]) {
  return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim();
}

function requireGh() {
  try {
    gh(["auth", "status"]);
  } catch {
    throw new Error(
      "gh no está instalado o no hay sesión. Ejecuta: gh auth login"
    );
  }
}

function repoSlug() {
  return gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
}

/**
 * Commits que la rama de origen tiene y la de destino todavía no, preguntando a
 * GitHub en lugar de a git: así el script solo necesita `gh` autenticado y no
 * depende de que las credenciales de git estén configuradas.
 */
function pendingCommits(repo: string, head: string, base: string) {
  // El `--jq` recorta la respuesta en el servidor: la comparación completa trae
  // el diff de cada archivo y desborda el buffer del proceso.
  const raw = gh([
    "api",
    `repos/${repo}/compare/${base}...${head}`,
    "--jq",
    "[.commits[] | {sha: .sha[0:7], message: .commit.message}]"
  ]);
  const commits = JSON.parse(raw) as Array<{ sha: string; message: string }>;

  return commits.map((entry) => `${entry.sha} ${entry.message.split("\n")[0]}`);
}

function latestRunConclusion(branch: string) {
  const raw = gh([
    "run",
    "list",
    "--branch",
    branch,
    "--limit",
    "1",
    "--json",
    "conclusion,status,headSha"
  ]);
  const [run] = JSON.parse(raw) as Array<{
    conclusion: string;
    status: string;
    headSha: string;
  }>;
  return run;
}

function existingPullRequest(head: string, base: string) {
  const raw = gh([
    "pr",
    "list",
    "--head",
    head,
    "--base",
    base,
    "--state",
    "open",
    "--json",
    "number,url"
  ]);
  const [pr] = JSON.parse(raw) as Array<{ number: number; url: string }>;
  return pr;
}

function main() {
  const target = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  const step = target ? flow[target] : undefined;

  if (!step) {
    throw new Error(
      `Destino inválido. Usa uno de: ${Object.keys(flow).join(", ")}.`
    );
  }

  requireGh();
  const repo = repoSlug();
  const commits = pendingCommits(repo, step.head, target);
  if (commits.length === 0) {
    console.log(`No hay nada que promover: ${target} ya tiene todo de ${step.head}.`);
    return;
  }

  console.log(`${commits.length} commit(s) de ${step.head} hacia ${target}:`);
  for (const commit of commits.slice(0, 10)) console.log(`  ${commit}`);
  if (commits.length > 10) console.log(`  … y ${commits.length - 10} más`);

  const run = latestRunConclusion(step.head);
  if (!run) {
    console.log(`\nAviso: ${step.head} no tiene ejecuciones de CI registradas.`);
  } else if (run.status !== "completed") {
    console.log(`\nAviso: el CI de ${step.head} todavía está corriendo.`);
  } else if (run.conclusion !== "success") {
    // No se aborta: la rama protegida igual va a impedir la fusión. Se avisa
    // para que nadie abra un PR creyendo que va a entrar solo.
    console.log(
      `\nAviso: la última ejecución de CI en ${step.head} terminó en "${run.conclusion}". ` +
        "El PR quedará abierto pero no se fusionará hasta que esté en verde."
    );
  }

  if (dryRun) {
    console.log("\n[dry-run] No se creó ningún Pull Request.");
    return;
  }

  const open = existingPullRequest(step.head, target);
  const url = open
    ? open.url
    : gh([
        "pr",
        "create",
        "--base",
        target,
        "--head",
        step.head,
        "--title",
        step.title,
        "--body",
        `Promoción automática de \`${step.head}\` a \`${target}\`.`
      ]);

  if (open) console.log(`\nYa había un PR abierto: ${url}`);
  else console.log(`\nPull Request creado: ${url}`);

  gh(["pr", "merge", url, "--auto", "--merge"]);
  console.log("Auto-merge activado: se fusiona solo cuando el CI termine en verde.");
}

try {
  main();
} catch (error) {
  // Los mensajes de este script hablan de ramas y de `gh`, no de credenciales.
  if (error instanceof Error && !/token|password|credential/i.test(error.message)) {
    console.error(error.message);
  } else {
    reportScriptError("promote-branch", error);
  }
  process.exitCode = 1;
}
