import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sigecoModuleCodes } from "@/features/modules/catalog";
import { prisma } from "@/modules/database";
import {
  ModuleActivationError,
  getActiveModules,
  getModuleActivationHistory,
  getModuleAccessState,
  getModuleActivationStates,
  getModulePendingWork,
  getSuspendedModules,
  setModuleActivation
} from "@/modules/database/queries/modules";

/**
 * Deja el estado base que produce la migración: los once módulos con solo el
 * núcleo encendido.
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
    data: sigecoModuleCodes.map((code) => ({
      code,
      status: code === "core" ? ("active" as const) : ("inactive" as const),
      activatedAt: code === "core" ? new Date() : null
    }))
  });
  await prisma.moduleActivationEvent.create({
    data: {
      moduleCode: "core",
      previousStatus: "inactive",
      status: "active",
      reason: "Instalación inicial del lanzamiento por etapas."
    }
  });
}

beforeEach(resetModuleState);
afterEach(resetModuleState);

describe("estado inicial de los módulos", () => {
  it("tiene una fila por cada módulo del catálogo", async () => {
    const rows = await prisma.moduleActivation.findMany({ select: { code: true } });

    expect(rows.map((row) => row.code).sort()).toEqual([...sigecoModuleCodes].sort());
  });

  it("deja encendido solo el núcleo en una base recién migrada", async () => {
    await expect(getActiveModules()).resolves.toEqual(["core"]);
  });

  it("registra el encendido del núcleo en el historial", async () => {
    const history = await getModuleActivationHistory({ code: "core" });

    expect(history.at(-1)).toMatchObject({
      moduleCode: "core",
      previousStatus: "inactive",
      status: "active"
    });
  });
});

describe("getActiveModules", () => {
  it("incluye un módulo encendido", async () => {
    await prisma.moduleActivation.update({
      where: { code: "administracion" },
      data: { status: "active", activatedAt: new Date() }
    });

    // Sin `cache` de React fuera de un request, la consulta se ejecuta de nuevo.
    await expect(getActiveModules()).resolves.toEqual(["core", "administracion"]);
  });

  it("ignora una fila cuyo código ya no existe en el catálogo", async () => {
    await prisma.moduleActivation.create({
      data: { code: "modulo-retirado", status: "active", activatedAt: new Date() }
    });

    await expect(getActiveModules()).resolves.toEqual(["core"]);
  });
});

describe("getModuleActivationStates", () => {
  it("devuelve los once módulos en el orden del catálogo", async () => {
    const states = await getModuleActivationStates();

    expect(states.map((state) => state.code)).toEqual([...sigecoModuleCodes]);
  });

  it("marca el núcleo como siempre activo y el resto como apagado", async () => {
    const states = await getModuleActivationStates();
    const core = states.find((state) => state.code === "core");
    const reception = states.find((state) => state.code === "recepcion");

    expect(core).toMatchObject({ alwaysActive: true, active: true });
    expect(reception).toMatchObject({ alwaysActive: false, active: false });
  });

  it("trata como apagado un módulo del catálogo sin fila en base", async () => {
    await prisma.moduleActivation.delete({ where: { code: "opiniones" } });

    const states = await getModuleActivationStates();

    expect(states.find((state) => state.code === "opiniones")).toMatchObject({
      active: false,
      activatedAt: null
    });

    await prisma.moduleActivation.create({ data: { code: "opiniones" } });
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
    const history = await getModuleActivationHistory({ code: "core" });

    expect(history.length).toBeGreaterThan(0);
    expect(history.every((entry) => entry.reason !== "editado")).toBe(true);
  });
});

describe("setModuleActivation", () => {
  it("enciende un módulo y deja el cambio en el historial", async () => {
    await setModuleActivation({ code: "administracion", active: true });

    await expect(getActiveModules()).resolves.toContain("administracion");
    const history = await getModuleActivationHistory({ code: "administracion" });
    expect(history[0]).toMatchObject({
      previousStatus: "inactive",
      status: "active"
    });
  });

  it("no enciende un módulo sin sus dependencias", async () => {
    await expect(setModuleActivation({ code: "compras", active: true })).rejects.toMatchObject({
      code: "missing_dependencies",
      blockers: ["inventario"]
    });

    await expect(getActiveModules()).resolves.not.toContain("compras");
  });

  it("no apaga un módulo del que otro activo depende", async () => {
    await setModuleActivation({ code: "recepcion", active: true });
    await setModuleActivation({ code: "consulta", active: true });

    await expect(
      setModuleActivation({ code: "recepcion", active: false, reason: "prueba" })
    ).rejects.toMatchObject({
      code: "required_by_active_modules",
      blockers: ["consulta"]
    });
  });

  it("exige motivo para apagar", async () => {
    // Opiniones depende de Recepción: encender en orden es parte de la regla.
    await setModuleActivation({ code: "recepcion", active: true });
    await setModuleActivation({ code: "opiniones", active: true });

    await expect(
      setModuleActivation({ code: "opiniones", active: false })
    ).rejects.toBeInstanceOf(ModuleActivationError);
  });

  it("no apaga el núcleo", async () => {
    await expect(
      setModuleActivation({ code: "core", active: false, reason: "prueba" })
    ).rejects.toMatchObject({ code: "always_active" });

    await expect(getActiveModules()).resolves.toContain("core");
  });

  it("apaga un módulo del que nadie depende y conserva la historia", async () => {
    await setModuleActivation({ code: "inventario", active: true });
    await setModuleActivation({
      code: "inventario",
      active: false,
      reason: "Incidente de stock"
    });

    await expect(getActiveModules()).resolves.not.toContain("inventario");
    const history = await getModuleActivationHistory({ code: "inventario" });
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
    await expect(getSuspendedModules()).resolves.toEqual([]);
  });

  it("reporta el módulo que estuvo activo y fue apagado, con su motivo", async () => {
    await setModuleActivation({ code: "catalogo", active: true });
    await setModuleActivation({
      code: "catalogo",
      active: false,
      reason: "Precios en revisión"
    });

    const suspended = await getSuspendedModules();

    expect(suspended).toHaveLength(1);
    expect(suspended[0]).toMatchObject({ code: "catalogo", note: "Precios en revisión" });
  });
});

describe("apagar y reactivar", () => {
  it("no altera ningún registro del módulo", async () => {
    await setModuleActivation({ code: "inventario", active: true });

    const before = await prisma.inventoryItem.findMany({
      select: { id: true, name: true, currentStock: true, updatedAt: true },
      orderBy: { id: "asc" }
    });

    await setModuleActivation({
      code: "inventario",
      active: false,
      reason: "Simulacro de suspensión"
    });
    await setModuleActivation({ code: "inventario", active: true });

    const after = await prisma.inventoryItem.findMany({
      select: { id: true, name: true, currentStock: true, updatedAt: true },
      orderBy: { id: "asc" }
    });

    expect(after).toEqual(before);
  });

  it("conserva el historial completo del ciclo", async () => {
    await setModuleActivation({ code: "recepcion", active: true });
    await setModuleActivation({ code: "opiniones", active: true });
    await setModuleActivation({
      code: "opiniones",
      active: false,
      reason: "Revisión de textos"
    });
    await setModuleActivation({ code: "opiniones", active: true });

    const history = await getModuleActivationHistory({ code: "opiniones" });

    expect(history.slice(0, 3).map((event) => event.status)).toEqual([
      "active",
      "inactive",
      "active"
    ]);
    expect(history[1]?.reason).toBe("Revisión de textos");
  });
});

describe("getModuleAccessState", () => {
  it("separa lo activo de lo suspendido", async () => {
    await setModuleActivation({ code: "administracion", active: true });
    await setModuleActivation({
      code: "administracion",
      active: false,
      reason: "Incidente de Caja"
    });

    const state = await getModuleAccessState();

    expect(state.active).toContain("core");
    expect(state.active).not.toContain("administracion");
    expect(state.suspended).toContain("administracion");
  });

  it("no marca como suspendido un módulo que nunca se lanzó", async () => {
    const state = await getModuleAccessState();

    expect(state.suspended).not.toContain("consulta");
  });
});

describe("getModulePendingWork", () => {
  it("no consulta nada cuando no hay módulos suspendidos", async () => {
    await expect(getModulePendingWork([])).resolves.toEqual([]);
  });

  it("informa el trabajo abierto del módulo suspendido", async () => {
    const work = await getModulePendingWork(["administracion"]);

    expect(work).toHaveLength(1);
    expect(work[0]?.code).toBe("administracion");
    expect(work[0]?.items.map((item) => item.label)).toEqual([
      "Ventas con saldo",
      "Cajas sin cerrar",
      "Cobros pendientes"
    ]);
  });

  it("omite los módulos que no acumulan pendientes", async () => {
    await expect(getModulePendingWork(["catalogo", "reportes"])).resolves.toEqual([]);
  });
});
