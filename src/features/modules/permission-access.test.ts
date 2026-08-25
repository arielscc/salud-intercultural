import { describe, expect, it } from "vitest";
import { InternalPermission } from "@/generated/prisma/enums";
import {
  isReadPermission,
  isWritePermission,
  permissionAccess
} from "@/features/modules/permission-access";

const allPermissions = Object.values(InternalPermission);

describe("clasificación de permisos", () => {
  // Sin esta prueba, un permiso nuevo sin clasificar se trataría como escritura
  // por descarte y desaparecería de la lectura de un módulo suspendido.
  it("clasifica todos los permisos del enum", () => {
    const classified = new Set(Object.keys(permissionAccess));

    expect(allPermissions.filter((permission) => !classified.has(permission))).toEqual([]);
  });

  it("no clasifica permisos que ya no existen", () => {
    const known = new Set<string>(allPermissions);

    expect(Object.keys(permissionAccess).filter((key) => !known.has(key))).toEqual([]);
  });

  it("trata como lectura lo que solo permite mirar", () => {
    for (const permission of [
      "internal_access",
      "patients_read",
      "visits_read",
      "sales_read",
      "cash_sessions_read",
      "inventory_cost_read",
      "audit_read",
      "reports_read"
    ] as const) {
      expect(isReadPermission(permission), permission).toBe(true);
    }
  });

  it("trata como escritura lo que registra una decisión aunque no diga write", () => {
    for (const permission of [
      "reminders_review",
      "patient_duplicates_review",
      "patient_duplicates_merge",
      "attribution_manage",
      "feedback_manage",
      "discount_threshold_manage",
      "cash_sessions_approve",
      "documents_configure",
      "modules_manage"
    ] as const) {
      expect(isWritePermission(permission), permission).toBe(true);
    }
  });

  it("clasifica como escritura todo permiso terminado en _write", () => {
    for (const permission of allPermissions.filter((value) => value.endsWith("_write"))) {
      expect(isWritePermission(permission), permission).toBe(true);
    }
  });
});
