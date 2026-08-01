import type { ClinicBranchStatus, InternalRole } from "@/generated/prisma/client";

export const defaultBranchCode = "el-alto";
export const activeBranchCookieName = "sigeco_active_branch";

export const branchStatusLabels: Record<ClinicBranchStatus, string> = {
  active: "Activa",
  preparation: "En preparación",
  inactive: "Inactiva"
};

export function canViewConsolidatedBranches(role: InternalRole) {
  return role === "direccion" || role === "super_admin";
}

export function branchDisplayName(branch: { name: string; city: string }) {
  return branch.name === branch.city ? branch.name : `${branch.name} · ${branch.city}`;
}
