import { sigecoLaunchStages } from "../src/features/modules/catalog";
import { prisma } from "../src/modules/database";
import { reportScriptError } from "./safe-error";

/*
 * Revisa si una base está lista para operar la Etapa 1: Caja, Administración,
 * Inventario, Compras y Catálogo con datos reales.
 *
 * No carga nada ni corrige nada. Solo mira y dice qué falta, para que nadie
 * descubra el día del lanzamiento que quedaron productos de demostración o
 * stock sin respaldo.
 *
 * Uso: pnpm stage-one:check
 */

type Check = {
  name: string;
  ok: boolean;
  detail: string;
  /** Un aviso no impide lanzar; una falla sí. */
  warning?: boolean;
};

/** Marcas que dejan los seeds de demostración y de staging. */
const demoCodePrefixes = ["DEMO-", "QA-"];
const demoEmailFragments = ["@example.com", ".demo", "staging.invalid", "@test."];

const stageOneModules = sigecoLaunchStages[0]?.modules ?? [];

async function checkModules(): Promise<Check[]> {
  const rows = await prisma.moduleActivation.findMany({
    select: { code: true, status: true }
  });
  const active = new Set(rows.filter((row) => row.status === "active").map((row) => row.code));
  const missing = stageOneModules.filter((code) => !active.has(code));
  const clinical = ["recepcion", "consulta", "enfermeria"].filter((code) => active.has(code));

  return [
    {
      name: "Módulos de la Etapa 1 encendidos",
      ok: missing.length === 0,
      detail: missing.length === 0 ? stageOneModules.join(", ") : `faltan: ${missing.join(", ")}`
    },
    {
      name: "Módulos clínicos todavía apagados",
      ok: clinical.length === 0,
      warning: true,
      detail:
        clinical.length === 0
          ? "ninguno encendido"
          : `encendidos: ${clinical.join(", ")} (correcto solo si ya se lanzó otra etapa)`
    }
  ];
}

async function checkBranch(): Promise<Check> {
  const branch = await prisma.clinicBranch.findUnique({
    where: { code: "el-alto" },
    select: { status: true, name: true }
  });

  return {
    name: "Sucursal El Alto activa",
    ok: branch?.status === "active",
    detail: branch ? `${branch.name}: ${branch.status}` : "la sucursal no existe"
  };
}

async function checkDemoData(): Promise<Check[]> {
  const [demoItems, demoPatients, demoSuppliers, demoUsers, demoCatalog] = await Promise.all([
    prisma.inventoryItem.count({
      where: { OR: demoCodePrefixes.map((prefix) => ({ internalCode: { startsWith: prefix } })) }
    }),
    prisma.patient.count({
      where: { OR: demoCodePrefixes.map((prefix) => ({ internalCode: { startsWith: prefix } })) }
    }),
    prisma.supplier.count({
      where: { OR: demoEmailFragments.map((fragment) => ({ email: { contains: fragment } })) }
    }),
    prisma.internalUser.findMany({
      where: { OR: demoEmailFragments.map((fragment) => ({ email: { contains: fragment } })) },
      select: { email: true }
    }),
    prisma.serviceCatalogItem.count({
      where: { OR: demoCodePrefixes.map((prefix) => ({ code: { startsWith: prefix } })) }
    })
  ]);

  return [
    {
      name: "Sin productos ni catálogo de demostración",
      ok: demoItems === 0 && demoCatalog === 0,
      detail: `productos ${demoItems}, ofertas ${demoCatalog}`
    },
    {
      name: "Sin pacientes sintéticos",
      ok: demoPatients === 0,
      detail: `${demoPatients} fichas con código de prueba`
    },
    {
      name: "Sin proveedores de demostración",
      ok: demoSuppliers === 0,
      detail: `${demoSuppliers} proveedores con correo de prueba`
    },
    {
      name: "Sin usuarios de prueba",
      ok: demoUsers.length === 0,
      detail:
        demoUsers.length === 0
          ? "ninguno"
          : `${demoUsers.length} cuentas de prueba activas o inactivas`
    }
  ];
}

async function checkProducts(): Promise<Check[]> {
  const [total, withoutPrice, withoutUnit, withoutSupplier] = await Promise.all([
    prisma.inventoryItem.count({ where: { active: true } }),
    prisma.inventoryItem.count({ where: { active: true, salePriceCents: { lte: 0 } } }),
    prisma.inventoryItem.count({ where: { active: true, OR: [{ unit: "" }, { unit: "unidad" }] } }),
    prisma.inventoryItem.count({ where: { active: true, supplierLinks: { none: {} } } })
  ]);

  return [
    {
      name: "Hay productos cargados",
      ok: total > 0,
      detail: `${total} productos activos`
    },
    {
      name: "Todos los productos tienen precio de venta",
      ok: withoutPrice === 0,
      detail: `${withoutPrice} sin precio`
    },
    {
      name: "Los productos declaran su unidad",
      ok: withoutUnit === 0,
      warning: true,
      detail: `${withoutUnit} quedaron en la unidad por defecto`
    },
    {
      name: "Los productos tienen proveedor asociado",
      ok: withoutSupplier === 0,
      warning: true,
      detail: `${withoutSupplier} sin proveedor`
    }
  ];
}

async function checkStockBacking(): Promise<Check> {
  // El stock del sistema tiene que ser la suma de sus movimientos: un número
  // escrito a mano no se puede auditar ni explicar frente a una diferencia.
  const items = await prisma.inventoryItem.findMany({
    where: { active: true },
    select: { id: true, internalCode: true, currentStock: true }
  });
  const movements = await prisma.inventoryMovement.groupBy({
    by: ["itemId"],
    _sum: { quantityDelta: true }
  });
  const byItem = new Map(movements.map((row) => [row.itemId, row._sum.quantityDelta ?? 0]));
  const mismatched = items.filter((item) => (byItem.get(item.id) ?? 0) !== item.currentStock);

  return {
    name: "El stock coincide con sus movimientos",
    ok: mismatched.length === 0,
    detail:
      mismatched.length === 0
        ? `${items.length} productos revisados`
        : `${mismatched.length} sin respaldo: ${mismatched
            .slice(0, 5)
            .map((item) => item.internalCode)
            .join(", ")}`
  };
}

async function checkStaff(): Promise<Check[]> {
  const users = await prisma.internalUser.findMany({
    where: { active: true },
    select: { role: true }
  });
  const roles = new Set(users.map((user) => user.role));

  return [
    {
      name: "Hay un super administrador activo",
      ok: roles.has("super_admin"),
      detail: `${users.length} cuentas activas`
    },
    {
      name: "Hay alguien de Administración",
      ok: roles.has("administracion"),
      detail: roles.has("administracion") ? "sí" : "nadie puede cobrar"
    },
    {
      name: "Hay Dirección para autorizar",
      ok: roles.has("direccion"),
      warning: true,
      detail: roles.has("direccion") ? "sí" : "las autorizaciones quedan sin responsable"
    }
  ];
}

async function checkPaymentMethods(): Promise<Check[]> {
  const methods = await prisma.paymentMethod.findMany({
    where: { active: true },
    select: { code: true }
  });
  const codes = methods.map((method) => method.code);

  // Desde el 2026-08-14 la interfaz solo ofrece efectivo y QR. Un método activo
  // que nadie puede elegir ensucia la conciliación de Caja sin aportar nada.
  const unused = codes.filter((code) => code !== "cash" && code !== "qr");

  return [
    {
      name: "Formas de cobro disponibles",
      ok: codes.includes("cash") && codes.includes("qr"),
      detail: codes.join(", ") || "ninguna"
    },
    {
      name: "Sin formas de cobro que la interfaz ya no ofrece",
      ok: unused.length === 0,
      warning: true,
      detail: unused.length === 0 ? "solo efectivo y QR" : `activas sin uso: ${unused.join(", ")}`
    }
  ];
}

async function main() {
  const checks: Check[] = [
    ...(await checkModules()),
    await checkBranch(),
    ...(await checkDemoData()),
    ...(await checkProducts()),
    await checkStockBacking(),
    ...(await checkStaff()),
    ...(await checkPaymentMethods())
  ];

  const width = Math.max(...checks.map((check) => check.name.length));
  for (const check of checks) {
    const mark = check.ok ? "OK  " : check.warning ? "AVISO" : "FALTA";
    console.log(`${mark.padEnd(6)} ${check.name.padEnd(width)}  ${check.detail}`);
  }

  const blocking = checks.filter((check) => !check.ok && !check.warning);
  const warnings = checks.filter((check) => !check.ok && check.warning);

  console.log("");
  console.log(
    blocking.length === 0
      ? `Etapa 1 lista${warnings.length > 0 ? ` con ${warnings.length} aviso(s) para revisar` : ""}.`
      : `Faltan ${blocking.length} condición(es) antes de lanzar la Etapa 1.`
  );

  if (blocking.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    reportScriptError("stage-one:check", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
