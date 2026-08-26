import { describe, expect, it } from "vitest";
import {
  canUse,
  isReadOnlyAccess,
  resolveModuleAccess,
  roleKeepsSuspendedAccess,
  type ModuleAccessState
} from "@/features/modules/access";
import { normalizeActiveModules } from "@/features/modules/activation";
import type { SigecoModuleCode } from "@/features/modules/catalog";

function access(
  active: string[],
  suspended: SigecoModuleCode[] = []
): ModuleAccessState {
  return { active: normalizeActiveModules(active), suspended };
}

const stageOne = access(["administracion", "inventario", "compras", "catalogo"]);

describe("canUse", () => {
  it("exige el permiso del rol además del módulo", () => {
    expect(canUse("enfermeria", stageOne, "sales_write")).toBe(false);
    expect(canUse("administracion", stageOne, "sales_write")).toBe(true);
  });

  it("oculta lo que el rol puede pero el módulo todavía no", () => {
    expect(canUse("medico", stageOne, "clinical_read")).toBe(false);
    expect(canUse("recepcion", stageOne, "visits_read")).toBe(false);
  });

  it("permite leer fichas desde Administración sin Recepción lanzada", () => {
    expect(canUse("administracion", stageOne, "patients_read")).toBe(true);
  });

  it("fija el módulo cuando el enlace pertenece a una pantalla concreta", () => {
    // Administración tiene `patients_read`, pero la ficha vive en Recepción.
    expect(canUse("administracion", stageOne, "patients_read", "recepcion")).toBe(false);
  });

  it("nunca bloquea el núcleo", () => {
    expect(canUse("super_admin", access([]), "internal_access")).toBe(true);
    expect(canUse("super_admin", access([]), "users_manage")).toBe(true);
  });
});

describe("módulo suspendido", () => {
  // Caja estuvo lanzada y se apagó; Consulta nunca se encendió.
  const suspendedCash = access(["core", "inventario"], ["administracion"]);

  it("conserva la lectura para Dirección y el super administrador", () => {
    expect(resolveModuleAccess("direccion", suspendedCash, "sales_read")).toBe("read_only");
    expect(resolveModuleAccess("super_admin", suspendedCash, "sales_read")).toBe("read_only");
    expect(canUse("direccion", suspendedCash, "sales_read")).toBe(true);
  });

  it("bloquea la escritura para todos, incluido el super administrador", () => {
    expect(resolveModuleAccess("super_admin", suspendedCash, "sales_write")).toBe("blocked");
    expect(resolveModuleAccess("direccion", suspendedCash, "cash_sessions_open")).toBe("blocked");
    expect(canUse("super_admin", suspendedCash, "payments_write")).toBe(false);
  });

  it("no abre la lectura al resto del personal", () => {
    expect(resolveModuleAccess("administracion", suspendedCash, "sales_read")).toBe("blocked");
    expect(canUse("administracion", suspendedCash, "sales_read")).toBe(false);
    expect(roleKeepsSuspendedAccess("administracion")).toBe(false);
  });

  it("no confunde suspendido con nunca lanzado", () => {
    // Consulta no está en `suspended`: no hay trabajo abierto que consultar.
    expect(resolveModuleAccess("direccion", suspendedCash, "clinical_read")).toBe("blocked");
  });

  it("marca la lectura como solo lectura para poder avisarlo", () => {
    expect(isReadOnlyAccess("direccion", suspendedCash, "sales_read")).toBe(true);
    expect(isReadOnlyAccess("direccion", access(["core", "administracion"]), "sales_read")).toBe(
      false
    );
  });

  it("respeta el módulo fijado al resolver la suspensión", () => {
    const suspendedReception = access(["core", "administracion"], ["recepcion"]);

    // `patients_read` sigue habilitado por Administración, que está lanzada.
    expect(resolveModuleAccess("direccion", suspendedReception, "patients_read")).toBe("allowed");
    // Fijado a Recepción, es una lectura de módulo suspendido.
    expect(
      resolveModuleAccess("direccion", suspendedReception, "patients_read", "recepcion")
    ).toBe("read_only");
  });
});
