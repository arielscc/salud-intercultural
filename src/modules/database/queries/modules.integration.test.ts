import { afterEach, describe, expect, it } from "vitest";
import { sigecoModuleCodes } from "@/features/modules/catalog";
import { prisma } from "@/modules/database";
import {
  getActiveModules,
  getModuleActivationHistory,
  getModuleActivationStates
} from "@/modules/database/queries/modules";

/**
 * El estado inicial lo crea la migración, no el test: aquí no se trunca
 * `ModuleActivation` porque eso borraría lo que la migración sembró. Cada
 * prueba que enciende algo lo devuelve a apagado al terminar.
 */
async function restoreInitialState() {
  await prisma.moduleActivation.updateMany({
    where: { code: { not: "core" } },
    data: { status: "inactive", activatedAt: null, deactivatedAt: null, note: null }
  });
  await prisma.moduleActivation.deleteMany({
    where: { code: { notIn: [...sigecoModuleCodes] } }
  });
}

afterEach(restoreInitialState);

describe("estado inicial de los módulos", () => {
  it("crea una fila por cada módulo del catálogo", async () => {
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
