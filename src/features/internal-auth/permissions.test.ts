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
});
