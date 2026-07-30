import { describe, expect, it } from "vitest";
import {
  assignableInternalRoles,
  roleHasPermission
} from "@/features/internal-auth/permissions";

describe("internal role permissions", () => {
  it("keeps lead permissions out of every role after the simplification", () => {
    expect(roleHasPermission("super_admin", "leads_read")).toBe(false);
    expect(roleHasPermission("direccion", "leads_read")).toBe(false);
    expect(roleHasPermission("recepcion", "leads_create")).toBe(false);
    expect(roleHasPermission("captacion", "leads_read")).toBe(false);
    expect(roleHasPermission("captacion", "leads_contact")).toBe(false);
    expect(roleHasPermission("administracion", "leads_read")).toBe(false);
    expect(roleHasPermission("captacion", "reports_read")).toBe(false);
  });

  it("keeps clinical and nursing roles away from CRM actions by default", () => {
    expect(roleHasPermission("medico", "leads_update")).toBe(false);
    expect(roleHasPermission("enfermeria", "leads_read")).toBe(false);
  });

  it("allows nursing records without diagnostic write access", () => {
    expect(roleHasPermission("enfermeria", "nursing_read")).toBe(true);
    expect(roleHasPermission("enfermeria", "nursing_write")).toBe(true);
    expect(roleHasPermission("enfermeria", "studies_write")).toBe(true);
    expect(roleHasPermission("enfermeria", "clinical_write")).toBe(false);
    expect(roleHasPermission("enfermeria", "clinical_read")).toBe(false);
  });

  it("limits clinical finalization and correction to doctors and super administrators", () => {
    for (const role of ["medico", "super_admin"] as const) {
      expect(roleHasPermission(role, "clinical_finalize")).toBe(true);
      expect(roleHasPermission(role, "clinical_correct")).toBe(true);
    }

    expect(roleHasPermission("direccion", "clinical_read")).toBe(true);
    expect(roleHasPermission("direccion", "clinical_finalize")).toBe(false);
    expect(roleHasPermission("direccion", "clinical_correct")).toBe(false);
    expect(roleHasPermission("enfermeria", "clinical_correct")).toBe(false);
    expect(roleHasPermission("administracion", "clinical_correct")).toBe(false);
  });

  it("allows administration sales without clinical or studies writes", () => {
    expect(roleHasPermission("administracion", "sales_read")).toBe(true);
    expect(roleHasPermission("administracion", "sales_write")).toBe(true);
    expect(roleHasPermission("administracion", "payments_write")).toBe(true);
    expect(roleHasPermission("administracion", "clinical_write")).toBe(false);
    expect(roleHasPermission("administracion", "studies_write")).toBe(false);
  });

  it("separates Caja operation from Direction approval", () => {
    for (const permission of [
      "cash_sessions_read",
      "cash_sessions_open",
      "cash_movements_create",
      "cash_sessions_close"
    ] as const) {
      expect(roleHasPermission("administracion", permission)).toBe(true);
    }
    expect(
      roleHasPermission("administracion", "cash_movements_reverse")
    ).toBe(false);
    expect(
      roleHasPermission("administracion", "cash_sessions_approve")
    ).toBe(false);

    expect(roleHasPermission("direccion", "cash_sessions_read")).toBe(true);
    expect(
      roleHasPermission("direccion", "cash_movements_reverse")
    ).toBe(true);
    expect(
      roleHasPermission("direccion", "cash_sessions_approve")
    ).toBe(true);
    expect(roleHasPermission("direccion", "cash_sessions_open")).toBe(false);
    expect(
      roleHasPermission("direccion", "cash_movements_create")
    ).toBe(false);

    for (const role of [
      "medico",
      "recepcion",
      "enfermeria",
      "seguimiento",
      "captacion"
    ] as const) {
      expect(roleHasPermission(role, "cash_sessions_read")).toBe(false);
      expect(roleHasPermission(role, "cash_movements_create")).toBe(false);
    }
  });

  it("lets administration close visits after a sale (flexible flow)", () => {
    expect(roleHasPermission("administracion", "visits_update")).toBe(true);
    expect(roleHasPermission("administracion", "visits_create")).toBe(false);
  });

  it("allows follow-up work for the roles that keep it after the simplification", () => {
    expect(roleHasPermission("medico", "followups_write")).toBe(true);
    expect(roleHasPermission("direccion", "followups_read")).toBe(true);
    expect(roleHasPermission("administracion", "followups_write")).toBe(true);
  });

  it("gives recepcion follow-up work without clinical access", () => {
    expect(roleHasPermission("recepcion", "followups_read")).toBe(true);
    expect(roleHasPermission("recepcion", "followups_write")).toBe(true);
    expect(roleHasPermission("recepcion", "clinical_read")).toBe(false);
    expect(roleHasPermission("recepcion", "sales_write")).toBe(false);
  });

  it("retires captacion to internal access only until users are reassigned", () => {
    expect(roleHasPermission("captacion", "internal_access")).toBe(true);
    expect(roleHasPermission("captacion", "patients_read")).toBe(false);
    expect(roleHasPermission("captacion", "patients_create")).toBe(false);
    expect(roleHasPermission("captacion", "followups_read")).toBe(false);
    expect(roleHasPermission("captacion", "followups_write")).toBe(false);
  });

  it("keeps captacion out of the assignable roles and includes seguimiento", () => {
    expect(assignableInternalRoles).not.toContain("captacion");
    expect(assignableInternalRoles).toContain("seguimiento");
    expect(assignableInternalRoles).toContain("recepcion");
  });

  it("limits seguimiento to follow-up work and patient reads", () => {
    expect(roleHasPermission("seguimiento", "followups_read")).toBe(true);
    expect(roleHasPermission("seguimiento", "followups_write")).toBe(true);
    expect(roleHasPermission("seguimiento", "patients_read")).toBe(true);
    expect(roleHasPermission("seguimiento", "patients_update")).toBe(false);
    expect(roleHasPermission("seguimiento", "leads_read")).toBe(false);
    expect(roleHasPermission("seguimiento", "clinical_read")).toBe(false);
    expect(roleHasPermission("seguimiento", "sales_read")).toBe(false);
  });

  it("scopes inventory adjustments to authorized roles", () => {
    expect(roleHasPermission("administracion", "inventory_read")).toBe(true);
    expect(roleHasPermission("administracion", "inventory_write")).toBe(true);
    expect(roleHasPermission("administracion", "inventory_cost_read")).toBe(true);
    expect(roleHasPermission("administracion", "suppliers_write")).toBe(true);
    expect(roleHasPermission("administracion", "inventory_adjust")).toBe(false);
    expect(roleHasPermission("direccion", "inventory_read")).toBe(true);
    expect(roleHasPermission("direccion", "inventory_cost_read")).toBe(true);
    expect(roleHasPermission("direccion", "suppliers_read")).toBe(true);
    expect(roleHasPermission("direccion", "suppliers_write")).toBe(false);
    expect(roleHasPermission("direccion", "inventory_adjust")).toBe(false);
    expect(roleHasPermission("medico", "inventory_read")).toBe(true);
    expect(roleHasPermission("enfermeria", "inventory_read")).toBe(true);
    expect(roleHasPermission("seguimiento", "inventory_read")).toBe(false);
    expect(roleHasPermission("super_admin", "inventory_adjust")).toBe(true);
  });

  it("restricts the audit history to direction and super administrators", () => {
    expect(roleHasPermission("super_admin", "audit_read")).toBe(true);
    expect(roleHasPermission("direccion", "audit_read")).toBe(true);
    expect(roleHasPermission("administracion", "audit_read")).toBe(false);
    expect(roleHasPermission("medico", "audit_read")).toBe(false);
  });

  it("restricts user administration to super administrators", () => {
    expect(roleHasPermission("super_admin", "users_manage")).toBe(true);
    expect(roleHasPermission("direccion", "users_manage")).toBe(false);
    expect(roleHasPermission("administracion", "users_manage")).toBe(false);
    expect(roleHasPermission("medico", "users_manage")).toBe(false);
    expect(roleHasPermission("recepcion", "users_manage")).toBe(false);
    expect(roleHasPermission("enfermeria", "users_manage")).toBe(false);
    expect(roleHasPermission("seguimiento", "users_manage")).toBe(false);
    expect(roleHasPermission("captacion", "users_manage")).toBe(false);
  });

  it("lets Direction and super administrators manage attribution catalogs", () => {
    expect(roleHasPermission("super_admin", "attribution_manage")).toBe(true);
    expect(roleHasPermission("direccion", "attribution_manage")).toBe(true);
    expect(roleHasPermission("recepcion", "attribution_manage")).toBe(false);
    expect(roleHasPermission("administracion", "attribution_manage")).toBe(
      false
    );
  });

  it("lets reception review duplicates but only super admin merge them", () => {
    expect(
      roleHasPermission("super_admin", "patient_duplicates_read")
    ).toBe(true);
    expect(
      roleHasPermission("super_admin", "patient_duplicates_review")
    ).toBe(true);
    expect(
      roleHasPermission("super_admin", "patient_duplicates_merge")
    ).toBe(true);
    expect(roleHasPermission("recepcion", "patient_duplicates_read")).toBe(
      true
    );
    expect(roleHasPermission("recepcion", "patient_duplicates_review")).toBe(
      true
    );
    expect(roleHasPermission("recepcion", "patient_duplicates_merge")).toBe(
      false
    );
    expect(roleHasPermission("direccion", "patient_duplicates_read")).toBe(
      true
    );
    expect(roleHasPermission("direccion", "patient_duplicates_review")).toBe(
      false
    );
    expect(roleHasPermission("medico", "patient_duplicates_read")).toBe(false);
  });

  it("lets only reception and super administrators record patient consents", () => {
    expect(roleHasPermission("recepcion", "patient_consents_write")).toBe(true);
    expect(roleHasPermission("super_admin", "patient_consents_write")).toBe(true);
    expect(roleHasPermission("direccion", "patient_consents_read")).toBe(true);
    expect(roleHasPermission("direccion", "patient_consents_write")).toBe(false);
    expect(roleHasPermission("medico", "patient_consents_write")).toBe(false);
    expect(roleHasPermission("seguimiento", "patient_consents_write")).toBe(false);
    expect(roleHasPermission("captacion", "patient_consents_read")).toBe(false);
  });

  it("lets operational areas record a discontinuation and Direction review it", () => {
    for (const role of [
      "super_admin",
      "recepcion",
      "medico",
      "enfermeria",
      "administracion"
    ] as const) {
      expect(
        roleHasPermission(role, "visit_discontinuations_write")
      ).toBe(true);
      expect(
        roleHasPermission(role, "visit_discontinuations_read")
      ).toBe(true);
    }

    expect(
      roleHasPermission("direccion", "visit_discontinuations_read")
    ).toBe(true);
    expect(
      roleHasPermission("direccion", "visit_discontinuations_write")
    ).toBe(false);
    expect(
      roleHasPermission("seguimiento", "visit_discontinuations_write")
    ).toBe(false);
  });
});
