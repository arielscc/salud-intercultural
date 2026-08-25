import { describe, expect, it } from "vitest";
import { InternalPermission } from "@/generated/prisma/enums";
import {
  alwaysActiveModuleCodes,
  getSigecoModule,
  sigecoLaunchStages,
  sigecoModuleCodes,
  sigecoModules,
  type SigecoModuleCode
} from "@/features/modules/catalog";
import {
  permissionModules,
  retiredPermissions
} from "@/features/modules/permission-modules";
import { resolveActivationBlockers } from "@/features/modules/activation";

const allPermissions = Object.values(InternalPermission);

describe("catálogo de módulos", () => {
  it("declara cada código una sola vez", () => {
    expect(new Set(sigecoModuleCodes).size).toBe(sigecoModuleCodes.length);
    expect(sigecoModules.map((entry) => entry.code)).toEqual([...sigecoModuleCodes]);
  });

  it("solo deja el núcleo como módulo que no se apaga", () => {
    expect(alwaysActiveModuleCodes).toEqual(["core"]);
  });

  it("apunta sus dependencias a módulos existentes", () => {
    for (const entry of sigecoModules) {
      for (const dependency of entry.dependsOn) {
        expect(sigecoModuleCodes).toContain(dependency);
      }
    }
  });

  it("no forma ciclos entre dependencias", () => {
    for (const code of sigecoModuleCodes) {
      expect(resolveActivationBlockers([], code)).not.toContain(code);
    }
  });

  it("conserva la cadena clínica: Enfermería exige Consulta y Consulta exige Recepción", () => {
    expect(getSigecoModule("enfermeria").dependsOn).toEqual(["consulta"]);
    expect(getSigecoModule("consulta").dependsOn).toEqual(["recepcion"]);
    expect(getSigecoModule("compras").dependsOn).toEqual(["inventario"]);
  });
});

describe("mapa de permisos por módulo", () => {
  // Esta es la prueba que impide que un permiso nuevo quede fuera del gate:
  // si alguien agrega un InternalPermission y no lo mapea, falla aquí.
  it("mapea todos los permisos del enum", () => {
    const mapped = new Set(Object.keys(permissionModules));
    const missing = allPermissions.filter((permission) => !mapped.has(permission));
    expect(missing).toEqual([]);
  });

  it("no declara permisos que ya no existen en el enum", () => {
    const known = new Set<string>(allPermissions);
    const unknown = Object.keys(permissionModules).filter(
      (permission) => !known.has(permission)
    );
    expect(unknown).toEqual([]);
  });

  it("solo nombra módulos del catálogo", () => {
    for (const [permission, modules] of Object.entries(permissionModules)) {
      for (const code of modules) {
        expect(sigecoModuleCodes, `permiso ${permission}`).toContain(code);
      }
    }
  });

  it("no repite un módulo dentro de un permiso", () => {
    for (const [permission, modules] of Object.entries(permissionModules)) {
      expect(new Set(modules).size, `permiso ${permission}`).toBe(modules.length);
    }
  });

  it("deja los permisos del núcleo fuera de cualquier módulo apagable", () => {
    for (const permission of [
      "internal_access",
      "users_manage",
      "audit_read",
      "documents_configure"
    ] as const) {
      expect(permissionModules[permission]).toEqual(["core"]);
    }
  });

  it("retira únicamente los permisos de leads", () => {
    expect([...retiredPermissions].sort()).toEqual(
      ["leads_contact", "leads_create", "leads_read", "leads_reminder", "leads_update"].sort()
    );
  });
});

describe("etapas de lanzamiento", () => {
  it("cubre todos los módulos apagables sin repetir ninguno", () => {
    const staged = sigecoLaunchStages.flatMap((stage) => stage.modules);
    expect(new Set(staged).size).toBe(staged.length);
    expect([...staged].sort()).toEqual(
      sigecoModuleCodes.filter((code) => code !== "core").slice().sort()
    );
  });

  it("permite activar cada etapa en orden sin dependencias faltantes", () => {
    const active: SigecoModuleCode[] = ["core"];
    for (const stage of sigecoLaunchStages) {
      for (const code of stage.modules) {
        expect(
          resolveActivationBlockers(active, code),
          `etapa ${stage.stage} · ${code}`
        ).toEqual([]);
        active.push(code);
      }
    }
  });
});
