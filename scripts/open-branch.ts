import { resolveDeploymentEnvironment } from "../src/lib/deployment-environment";
import { prisma } from "../src/modules/database";
import { reportScriptError } from "./safe-error";

/*
 * Abre o cierra una sucursal en un entorno de prueba.
 *
 * Una sede en preparación existe pero no opera: `getBranchContext` solo permite
 * elegir sucursales activas, así que Caja, ventas y stock quedan fuera de
 * alcance hasta que alguien la abre. Hasta hoy eso solo se podía hacer con SQL
 * a mano, y una apertura escrita a mano se equivoca de sede en silencio.
 *
 * Uso:
 *   SIGECO_BRANCH=cochabamba SIGECO_BRANCH_OPEN=true pnpm branch:open
 *   SIGECO_BRANCH=cochabamba SIGECO_BRANCH_OPEN=false pnpm branch:open
 *
 * Solo corre en local y en test. La apertura real de una sede en producción es
 * una decisión de Dirección, todavía no tiene pantalla y este cambio no deja
 * rastro en auditoría: no hay acción de auditoría para sucursales.
 */
async function main() {
  const environment = resolveDeploymentEnvironment();
  if (environment !== "local" && environment !== "test") {
    throw new Error("Opening a branch from a script is allowed only in local or test.");
  }

  const code = process.env.SIGECO_BRANCH?.trim();
  const openInput = process.env.SIGECO_BRANCH_OPEN?.trim().toLowerCase();

  if (!code || !openInput) {
    throw new Error("SIGECO_BRANCH and SIGECO_BRANCH_OPEN are required.");
  }

  if (!["true", "false"].includes(openInput)) {
    throw new Error('SIGECO_BRANCH_OPEN must be "true" or "false".');
  }

  const branch = await prisma.clinicBranch.findUnique({ where: { code } });
  if (!branch) {
    throw new Error(`Unknown branch "${code}".`);
  }

  const open = openInput === "true";

  // Al reabrir se conserva la fecha de apertura original: es el día en que la
  // sede empezó a operar, no el de la última vez que se encendió el interruptor.
  const updated = await prisma.clinicBranch.update({
    where: { code },
    data: {
      status: open ? "active" : "preparation",
      openedAt: open ? (branch.openedAt ?? new Date()) : branch.openedAt
    },
    select: { code: true, name: true, status: true, openedAt: true }
  });

  console.log(
    `Branch "${updated.code}" (${updated.name}) is now ${updated.status}` +
      (updated.openedAt ? `, opened ${updated.openedAt.toISOString()}.` : ".")
  );
}

main()
  .catch((error) => {
    reportScriptError("open-branch", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
