import { describe, expect, it } from "vitest";
import {
  branchDisplayName,
  canHoldMultipleActiveBranches,
  canViewConsolidatedBranches,
  hasAutomaticBranchAssignment
} from "@/features/branches/policy";

describe("multi-branch policy", () => {
  it("limits consolidated reporting to Direction and super administrators", () => {
    expect(canViewConsolidatedBranches("direccion")).toBe(true);
    expect(canViewConsolidatedBranches("super_admin")).toBe(true);
    expect(canViewConsolidatedBranches("administracion")).toBe(false);
    expect(canViewConsolidatedBranches("recepcion")).toBe(false);
  });

  it("automatically assigns every operable branch only to super administrators", () => {
    expect(hasAutomaticBranchAssignment("super_admin", "active")).toBe(true);
    expect(hasAutomaticBranchAssignment("super_admin", "preparation")).toBe(true);
    expect(hasAutomaticBranchAssignment("super_admin", "inactive")).toBe(false);
    expect(hasAutomaticBranchAssignment(null, "active")).toBe(false);
  });

  it("permite rotación multisucursal solamente a médicos y enfermería", () => {
    expect(canHoldMultipleActiveBranches(["medico", "medico"])).toBe(true);
    expect(canHoldMultipleActiveBranches(["enfermeria", "enfermeria"])).toBe(true);
    expect(canHoldMultipleActiveBranches(["super_admin", "super_admin"])).toBe(true);
    expect(canHoldMultipleActiveBranches(["administracion"])).toBe(true);
    expect(canHoldMultipleActiveBranches(["administracion", "administracion"])).toBe(false);
    expect(canHoldMultipleActiveBranches(["recepcion", "enfermeria"])).toBe(false);
    expect(canHoldMultipleActiveBranches(["medico", "enfermeria"])).toBe(false);
  });

  it("does not repeat the city when it is already the branch name", () => {
    expect(branchDisplayName({ name: "El Alto", city: "El Alto" })).toBe("El Alto");
    expect(branchDisplayName({ name: "Sucursal Centro", city: "Cochabamba" })).toBe(
      "Sucursal Centro · Cochabamba"
    );
  });
});
