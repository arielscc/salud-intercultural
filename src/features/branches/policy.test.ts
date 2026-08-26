import { describe, expect, it } from "vitest";
import {
  branchDisplayName,
  canViewConsolidatedBranches,
  defaultBranchCode
} from "@/features/branches/policy";

describe("multi-branch policy", () => {
  it("keeps El Alto as the safe default branch", () => {
    expect(defaultBranchCode).toBe("el-alto");
  });

  it("limits consolidated reporting to Direction and super administrators", () => {
    expect(canViewConsolidatedBranches("direccion")).toBe(true);
    expect(canViewConsolidatedBranches("super_admin")).toBe(true);
    expect(canViewConsolidatedBranches("administracion")).toBe(false);
    expect(canViewConsolidatedBranches("recepcion")).toBe(false);
  });

  it("does not repeat the city when it is already the branch name", () => {
    expect(branchDisplayName({ name: "El Alto", city: "El Alto" })).toBe("El Alto");
    expect(branchDisplayName({ name: "Sucursal Centro", city: "Cochabamba" })).toBe(
      "Sucursal Centro · Cochabamba"
    );
  });
});
