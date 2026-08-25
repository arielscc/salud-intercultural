import { describe, expect, it } from "vitest";
import {
  moduleCanBeDeactivated,
  moduleIsActive,
  modulesEnablingPermission,
  normalizeActiveModules,
  permissionIsEnabled,
  resolveActivationBlockers,
  resolveDeactivationBlockers
} from "@/features/modules/activation";

/** Módulos encendidos en la Etapa 1: Caja y Administración, sin ruta clínica. */
const stageOne = normalizeActiveModules([
  "administracion",
  "inventario",
  "compras",
  "catalogo"
]);

describe("normalizeActiveModules", () => {
  it("agrega el núcleo aunque no venga de la base", () => {
    expect(normalizeActiveModules([])).toEqual(["core"]);
  });

  it("descarta códigos que ya no existen en el catálogo", () => {
    expect(normalizeActiveModules(["administracion", "modulo-viejo"])).toEqual([
      "core",
      "administracion"
    ]);
  });

  it("elimina repetidos y conserva el orden del catálogo", () => {
    expect(normalizeActiveModules(["consulta", "recepcion", "consulta"])).toEqual([
      "core",
      "recepcion",
      "consulta"
    ]);
  });
});

describe("moduleIsActive", () => {
  it("mantiene el núcleo activo siempre", () => {
    expect(moduleIsActive([], "core")).toBe(true);
  });

  it("trata como apagado un módulo que no está en la lista", () => {
    expect(moduleIsActive(stageOne, "recepcion")).toBe(false);
    expect(moduleIsActive(stageOne, "administracion")).toBe(true);
  });
});

describe("permissionIsEnabled", () => {
  it("nunca bloquea el acceso al sistema ni la administración de la plataforma", () => {
    expect(permissionIsEnabled([], "internal_access")).toBe(true);
    expect(permissionIsEnabled([], "users_manage")).toBe(true);
    expect(permissionIsEnabled([], "audit_read")).toBe(true);
  });

  it("habilita vender, cobrar y manejar Caja en la Etapa 1", () => {
    for (const permission of [
      "sales_read",
      "sales_write",
      "payments_write",
      "cash_sessions_open",
      "cash_sessions_close",
      "inventory_write",
      "purchases_write",
      "service_catalog_write"
    ] as const) {
      expect(permissionIsEnabled(stageOne, permission), permission).toBe(true);
    }
  });

  it("deja a Administración leer y crear fichas sin Recepción encendida", () => {
    expect(permissionIsEnabled(stageOne, "patients_read")).toBe(true);
    expect(permissionIsEnabled(stageOne, "patients_create")).toBe(true);
    expect(permissionIsEnabled(stageOne, "patients_update")).toBe(true);
  });

  it("mantiene apagado todo lo clínico durante la Etapa 1", () => {
    for (const permission of [
      "visits_read",
      "patient_route_read",
      "clinical_read",
      "clinical_write",
      "nursing_write",
      "patient_consents_read",
      "followups_read",
      "feedback_read",
      "reports_read"
    ] as const) {
      expect(permissionIsEnabled(stageOne, permission), permission).toBe(false);
    }
  });

  it("habilita un permiso compartido con que un solo módulo esté activo", () => {
    const onlyReception = normalizeActiveModules(["recepcion"]);
    expect(permissionIsEnabled(onlyReception, "patients_read")).toBe(true);
    expect(permissionIsEnabled(onlyReception, "sales_read")).toBe(false);
    expect(modulesEnablingPermission("patients_read")).toEqual([
      "recepcion",
      "administracion"
    ]);
  });

  it("no habilita los permisos retirados ni con todos los módulos activos", () => {
    const everything = normalizeActiveModules([
      "administracion",
      "inventario",
      "compras",
      "catalogo",
      "recepcion",
      "consulta",
      "enfermeria",
      "seguimientos",
      "opiniones",
      "reportes"
    ]);
    expect(permissionIsEnabled(everything, "leads_read")).toBe(false);
    expect(permissionIsEnabled(everything, "leads_contact")).toBe(false);
  });
});

describe("resolveActivationBlockers", () => {
  it("no pide nada para un módulo sin dependencias", () => {
    expect(resolveActivationBlockers([], "administracion")).toEqual([]);
    expect(resolveActivationBlockers([], "recepcion")).toEqual([]);
  });

  it("exige la dependencia directa", () => {
    expect(resolveActivationBlockers([], "compras")).toEqual(["inventario"]);
    expect(resolveActivationBlockers(stageOne, "compras")).toEqual([]);
  });

  it("informa también las dependencias indirectas, en orden de encendido", () => {
    expect(resolveActivationBlockers(stageOne, "enfermeria")).toEqual([
      "recepcion",
      "consulta"
    ]);
    expect(resolveActivationBlockers(normalizeActiveModules(["recepcion"]), "enfermeria")).toEqual(
      ["consulta"]
    );
  });
});

describe("desactivación", () => {
  it("impide apagar el núcleo", () => {
    expect(moduleCanBeDeactivated("core")).toBe(false);
    expect(moduleCanBeDeactivated("administracion")).toBe(true);
  });

  it("no bloquea apagar un módulo del que nadie depende", () => {
    expect(resolveDeactivationBlockers(stageOne, "administracion")).toEqual([]);
  });

  it("exige apagar antes a quienes dependen de él, directa o indirectamente", () => {
    const clinical = normalizeActiveModules(["recepcion", "consulta", "enfermeria"]);
    expect(resolveDeactivationBlockers(clinical, "recepcion")).toEqual([
      "consulta",
      "enfermeria"
    ]);
    expect(resolveDeactivationBlockers(clinical, "consulta")).toEqual(["enfermeria"]);
    expect(resolveDeactivationBlockers(clinical, "enfermeria")).toEqual([]);
  });

  it("ignora a los dependientes que ya están apagados", () => {
    expect(resolveDeactivationBlockers(normalizeActiveModules(["inventario"]), "inventario")).toEqual(
      []
    );
  });
});
