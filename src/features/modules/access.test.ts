import { describe, expect, it } from "vitest";
import { canUse } from "@/features/modules/access";
import { normalizeActiveModules } from "@/features/modules/activation";

const stageOne = normalizeActiveModules([
  "administracion",
  "inventario",
  "compras",
  "catalogo"
]);

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
    expect(canUse("super_admin", normalizeActiveModules([]), "internal_access")).toBe(true);
    expect(canUse("super_admin", normalizeActiveModules([]), "users_manage")).toBe(true);
  });
});
