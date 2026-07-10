import { describe, expect, it } from "vitest";
import { roleHasPermission } from "@/features/internal-auth/permissions";

describe("internal role permissions", () => {
  it("allows captacion to operate leads without report access", () => {
    expect(roleHasPermission("captacion", "leads_read")).toBe(true);
    expect(roleHasPermission("captacion", "leads_create")).toBe(true);
    expect(roleHasPermission("captacion", "leads_contact")).toBe(true);
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

  it("allows administration sales without clinical or studies writes", () => {
    expect(roleHasPermission("administracion", "sales_read")).toBe(true);
    expect(roleHasPermission("administracion", "sales_write")).toBe(true);
    expect(roleHasPermission("administracion", "payments_write")).toBe(true);
    expect(roleHasPermission("administracion", "clinical_write")).toBe(false);
    expect(roleHasPermission("administracion", "studies_write")).toBe(false);
  });

  it("allows follow-up work without exposing clinical writes to captacion", () => {
    expect(roleHasPermission("captacion", "followups_read")).toBe(true);
    expect(roleHasPermission("captacion", "followups_write")).toBe(true);
    expect(roleHasPermission("captacion", "clinical_read")).toBe(false);
    expect(roleHasPermission("medico", "followups_write")).toBe(true);
    expect(roleHasPermission("direccion", "followups_read")).toBe(true);
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
    expect(roleHasPermission("administracion", "inventory_adjust")).toBe(false);
    expect(roleHasPermission("direccion", "inventory_read")).toBe(true);
    expect(roleHasPermission("direccion", "inventory_adjust")).toBe(false);
    expect(roleHasPermission("super_admin", "inventory_adjust")).toBe(true);
  });
});
