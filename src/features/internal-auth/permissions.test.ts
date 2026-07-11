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

  it("allows administration sales without clinical or studies writes", () => {
    expect(roleHasPermission("administracion", "sales_read")).toBe(true);
    expect(roleHasPermission("administracion", "sales_write")).toBe(true);
    expect(roleHasPermission("administracion", "payments_write")).toBe(true);
    expect(roleHasPermission("administracion", "clinical_write")).toBe(false);
    expect(roleHasPermission("administracion", "studies_write")).toBe(false);
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
    expect(roleHasPermission("administracion", "inventory_adjust")).toBe(false);
    expect(roleHasPermission("direccion", "inventory_read")).toBe(true);
    expect(roleHasPermission("direccion", "inventory_adjust")).toBe(false);
    expect(roleHasPermission("super_admin", "inventory_adjust")).toBe(true);
  });
});
