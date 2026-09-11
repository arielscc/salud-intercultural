import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sigecoModuleCodes } from "@/features/modules/catalog";
import { prisma } from "@/modules/database";
import {
  ModuleActivationError,
  getModuleActivationHistory,
  getModuleAccessStateForBranch,
  getModuleActivationStates,
  getModulePendingWork,
  getSuspendedModules,
  setModuleActivation
} from "@/modules/database/queries/modules";

/**
 * Sucursal de estas pruebas. El estado de los módulos es por sede, así que cada
 * lectura y cada escritura dice explícitamente en cuál ocurre.
 */
const branchCode = "el-alto";
const otherBranchCode = "cochabamba";

/** Módulos encendidos en la sucursal del ensayo. */
async function activeModules(code = branchCode) {
  return (await getModuleAccessStateForBranch(code)).active;
}

/**
 * Deja el estado base que produce la migración: los once módulos con solo el
 * núcleo encendido, en las dos sucursales.
 *
 * No alcanza con confiar en lo que sembró la migración. Seis archivos de
 * integración hacen `TRUNCATE ... "InternalUser" CASCADE`, y PostgreSQL propaga
 * a toda tabla que la referencie: `ModuleActivation` apunta a `InternalUser` en
 * `activatedById`, así que sus filas desaparecen cuando corre cualquiera de esos
 * archivos antes que este. Que la migración siembre el catálogo completo se
 * verifica aparte, sobre el archivo de migración.
 */
async function resetModuleState() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ModuleActivationEvent", "ModuleActivation" CASCADE'
  );
  await prisma.moduleActivation.createMany({
    data: [branchCode, otherBranchCode].flatMap((branch) =>
      sigecoModuleCodes.map((code) => ({
        code,
        branchCode: branch,
        status: code === "core" ? ("active" as const) : ("inactive" as const),
        activatedAt: code === "core" ? new Date() : null
      }))
    )
  });
  await prisma.moduleActivationEvent.create({
    data: {
      moduleCode: "core",
      branchCode,
      previousStatus: "inactive",
      status: "active",
      reason: "Instalación inicial del lanzamiento por etapas."
    }
  });
}

beforeEach(resetModuleState);
afterEach(resetModuleState);

describe("estado inicial de los módulos", () => {
  it("tiene una fila por cada módulo del catálogo en cada sucursal", async () => {
    for (const branch of [branchCode, otherBranchCode]) {
      const rows = await prisma.moduleActivation.findMany({
        where: { branchCode: branch },
        select: { code: true }
      });

      expect(rows.map((row) => row.code).sort()).toEqual([...sigecoModuleCodes].sort());
    }
  });

  it("deja encendido solo el núcleo en una base recién migrada", async () => {
    await expect(activeModules()).resolves.toEqual(["core"]);
  });

  it("registra el encendido del núcleo en el historial", async () => {
    const history = await getModuleActivationHistory({ branchCode, code: "core" });

    expect(history.at(-1)).toMatchObject({
      moduleCode: "core",
      previousStatus: "inactive",
      status: "active"
    });
  });
});

describe("módulos activos de una sucursal", () => {
  it("incluye un módulo encendido", async () => {
    await prisma.moduleActivation.update({
      where: { code_branchCode: { code: "administracion", branchCode } },
      data: { status: "active", activatedAt: new Date() }
    });

    // Sin `cache` de React fuera de un request, la consulta se ejecuta de nuevo.
    await expect(activeModules()).resolves.toEqual(["core", "administracion"]);
  });

  it("ignora una fila cuyo código ya no existe en el catálogo", async () => {
    await prisma.moduleActivation.create({
      data: { code: "modulo-retirado", branchCode, status: "active", activatedAt: new Date() }
    });

    await expect(activeModules()).resolves.toEqual(["core"]);
  });
});

describe("getModuleActivationStates", () => {
  it("devuelve los once módulos en el orden del catálogo", async () => {
    const states = await getModuleActivationStates(branchCode);

    expect(states.map((state) => state.code)).toEqual([...sigecoModuleCodes]);
  });

  it("marca el núcleo como siempre activo y el resto como apagado", async () => {
    const states = await getModuleActivationStates(branchCode);
    const core = states.find((state) => state.code === "core");
    const reception = states.find((state) => state.code === "recepcion");

    expect(core).toMatchObject({ alwaysActive: true, active: true });
    expect(reception).toMatchObject({ alwaysActive: false, active: false });
  });

  it("trata como apagado un módulo del catálogo sin fila en base", async () => {
    await prisma.moduleActivation.delete({
      where: { code_branchCode: { code: "opiniones", branchCode } }
    });

    const states = await getModuleActivationStates(branchCode);

    expect(states.find((state) => state.code === "opiniones")).toMatchObject({
      active: false,
      activatedAt: null
    });

    await prisma.moduleActivation.create({ data: { code: "opiniones", branchCode } });
  });
});

describe("historial append-only", () => {
  it("rechaza modificar un evento ya registrado", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "ModuleActivationEvent" SET "reason" = 'editado' WHERE "moduleCode" = 'core'`
      )
    ).rejects.toThrow(/append-only/i);
  });

  it("rechaza borrar un evento ya registrado", async () => {
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "ModuleActivationEvent" WHERE "moduleCode" = 'core'`)
    ).rejects.toThrow(/append-only/i);
  });

  it("conserva el evento después de los intentos", async () => {
    const history = await getModuleActivationHistory({ branchCode, code: "core" });

    expect(history.length).toBeGreaterThan(0);
    expect(history.every((entry) => entry.reason !== "editado")).toBe(true);
  });
});

describe("setModuleActivation", () => {
  it("enciende un módulo y deja el cambio en el historial", async () => {
    await setModuleActivation({ code: "administracion", branchCode, active: true });

    await expect(activeModules()).resolves.toContain("administracion");
    const history = await getModuleActivationHistory({ branchCode, code: "administracion" });
    expect(history[0]).toMatchObject({
      previousStatus: "inactive",
      status: "active"
    });
  });

  it("no enciende un módulo sin sus dependencias", async () => {
    await expect(setModuleActivation({ code: "compras", branchCode, active: true })).rejects.toMatchObject({
      code: "missing_dependencies",
      blockers: ["inventario"]
    });

    await expect(activeModules()).resolves.not.toContain("compras");
  });

  it("no apaga un módulo del que otro activo depende", async () => {
    await setModuleActivation({ code: "recepcion", branchCode, active: true });
    await setModuleActivation({ code: "consulta", branchCode, active: true });

    await expect(
      setModuleActivation({ code: "recepcion", branchCode, active: false, reason: "prueba" })
    ).rejects.toMatchObject({
      code: "required_by_active_modules",
      blockers: ["consulta"]
    });
  });

  it("exige motivo para apagar", async () => {
    // Opiniones depende de Recepción: encender en orden es parte de la regla.
    await setModuleActivation({ code: "recepcion", branchCode, active: true });
    await setModuleActivation({ code: "opiniones", branchCode, active: true });

    await expect(
      setModuleActivation({ code: "opiniones", branchCode, active: false })
    ).rejects.toBeInstanceOf(ModuleActivationError);
  });

  it("no apaga el núcleo", async () => {
    await expect(
      setModuleActivation({ code: "core", branchCode, active: false, reason: "prueba" })
    ).rejects.toMatchObject({ code: "always_active" });

    await expect(activeModules()).resolves.toContain("core");
  });

  it("apaga un módulo del que nadie depende y conserva la historia", async () => {
    await setModuleActivation({ code: "inventario", branchCode, active: true });
    await setModuleActivation({
      code: "inventario",
      branchCode,
      active: false,
      reason: "Incidente de stock"
    });

    await expect(activeModules()).resolves.not.toContain("inventario");
    const history = await getModuleActivationHistory({ branchCode, code: "inventario" });
    expect(history[0]).toMatchObject({
      previousStatus: "active",
      status: "inactive",
      reason: "Incidente de stock"
    });
    expect(history.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getSuspendedModules", () => {
  it("no reporta como suspendido un módulo que nunca se lanzó", async () => {
    await expect(getSuspendedModules(branchCode)).resolves.toEqual([]);
  });

  it("reporta el módulo que estuvo activo y fue apagado, con su motivo", async () => {
    await setModuleActivation({ code: "catalogo", branchCode, active: true });
    await setModuleActivation({
      code: "catalogo",
      branchCode,
      active: false,
      reason: "Precios en revisión"
    });

    const suspended = await getSuspendedModules(branchCode);

    expect(suspended).toHaveLength(1);
    expect(suspended[0]).toMatchObject({ code: "catalogo", note: "Precios en revisión" });
  });
});

describe("apagar y reactivar", () => {
  it("no altera ningún registro del módulo", async () => {
    await setModuleActivation({ code: "inventario", branchCode, active: true });

    const before = await prisma.branchInventoryBalance.findMany({
      where: { branchCode },
      select: { itemId: true, currentStock: true, updatedAt: true },
      orderBy: { itemId: "asc" }
    });

    await setModuleActivation({
      code: "inventario",
      branchCode,
      active: false,
      reason: "Simulacro de suspensión"
    });
    await setModuleActivation({ code: "inventario", branchCode, active: true });

    const after = await prisma.branchInventoryBalance.findMany({
      where: { branchCode },
      select: { itemId: true, currentStock: true, updatedAt: true },
      orderBy: { itemId: "asc" }
    });

    expect(after).toEqual(before);
  });

  it("conserva el historial completo del ciclo", async () => {
    await setModuleActivation({ code: "recepcion", branchCode, active: true });
    await setModuleActivation({ code: "opiniones", branchCode, active: true });
    await setModuleActivation({
      code: "opiniones",
      branchCode,
      active: false,
      reason: "Revisión de textos"
    });
    await setModuleActivation({ code: "opiniones", branchCode, active: true });

    const history = await getModuleActivationHistory({ branchCode, code: "opiniones" });

    expect(history.slice(0, 3).map((event) => event.status)).toEqual([
      "active",
      "inactive",
      "active"
    ]);
    expect(history[1]?.reason).toBe("Revisión de textos");
  });
});

describe("getModuleAccessStateForBranch", () => {
  it("separa lo activo de lo suspendido", async () => {
    await setModuleActivation({ code: "administracion", branchCode, active: true });
    await setModuleActivation({
      code: "administracion",
      branchCode,
      active: false,
      reason: "Incidente de Caja"
    });

    const state = await getModuleAccessStateForBranch(branchCode);

    expect(state.active).toContain("core");
    expect(state.active).not.toContain("administracion");
    expect(state.suspended).toContain("administracion");
  });

  it("no marca como suspendido un módulo que nunca se lanzó", async () => {
    const state = await getModuleAccessStateForBranch(branchCode);

    expect(state.suspended).not.toContain("consulta");
  });
});

describe("getModulePendingWork", () => {
  it("no consulta nada cuando no hay módulos suspendidos", async () => {
    await expect(getModulePendingWork([], branchCode)).resolves.toEqual([]);
  });

  it("informa el trabajo abierto del módulo suspendido", async () => {
    const work = await getModulePendingWork(["administracion"], branchCode);

    expect(work).toHaveLength(1);
    expect(work[0]?.code).toBe("administracion");
    expect(work[0]?.items.map((item) => item.label)).toEqual([
      "Ventas con saldo",
      "Cajas sin cerrar",
      "Cobros pendientes"
    ]);
  });

  it("omite los módulos que no acumulan pendientes", async () => {
    await expect(getModulePendingWork(["catalogo", "reportes"], branchCode)).resolves.toEqual([]);
  });
});

/**
 * El motivo de que la sucursal sea parte de la clave: apagar la Caja de una
 * sede por un incidente no debe dejar sin cobrar a la otra.
 */
describe("independencia entre sucursales", () => {
  it("enciende un módulo en una sede sin encenderlo en la otra", async () => {
    await setModuleActivation({ code: "administracion", branchCode, active: true });

    await expect(activeModules(branchCode)).resolves.toContain("administracion");
    await expect(activeModules(otherBranchCode)).resolves.not.toContain("administracion");
  });

  it("apaga un módulo en una sede y la otra sigue operando", async () => {
    await setModuleActivation({ code: "administracion", branchCode, active: true });
    await setModuleActivation({
      code: "administracion",
      branchCode: otherBranchCode,
      active: true
    });

    await setModuleActivation({
      code: "administracion",
      branchCode,
      active: false,
      reason: "Incidente de Caja en esta sede"
    });

    await expect(activeModules(branchCode)).resolves.not.toContain("administracion");
    await expect(activeModules(otherBranchCode)).resolves.toContain("administracion");
  });

  it("evalúa las dependencias duras dentro de cada sede", async () => {
    // Inventario encendido en la otra sede no habilita Compras en esta.
    await setModuleActivation({ code: "inventario", branchCode: otherBranchCode, active: true });

    await expect(
      setModuleActivation({ code: "compras", branchCode, active: true })
    ).rejects.toMatchObject({
      code: "missing_dependencies",
      blockers: ["inventario"]
    });
  });

  it("reporta como suspendido solo en la sede que lo apagó", async () => {
    await setModuleActivation({ code: "catalogo", branchCode, active: true });
    await setModuleActivation({
      code: "catalogo",
      branchCode,
      active: false,
      reason: "Precios en revisión"
    });

    await expect(getSuspendedModules(branchCode)).resolves.toMatchObject([
      { code: "catalogo" }
    ]);
    await expect(getSuspendedModules(otherBranchCode)).resolves.toEqual([]);
  });

  it("separa el historial por sede y conserva el pasado común", async () => {
    await setModuleActivation({ code: "inventario", branchCode, active: true });

    const own = await getModuleActivationHistory({ branchCode, code: "inventario" });
    const other = await getModuleActivationHistory({
      branchCode: otherBranchCode,
      code: "inventario"
    });

    expect(own).toHaveLength(1);
    expect(other).toHaveLength(0);

    // El evento sin sucursal es anterior al cambio y lo ven las dos sedes.
    await prisma.moduleActivationEvent.create({
      data: {
        moduleCode: "inventario",
        previousStatus: "inactive",
        status: "inactive",
        reason: "Cambio anterior a la activación por sucursal."
      }
    });

    await expect(
      getModuleActivationHistory({ branchCode: otherBranchCode, code: "inventario" })
    ).resolves.toHaveLength(1);
  });
});
