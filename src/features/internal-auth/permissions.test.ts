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
});
