import type {
  ClinicBranchStatus,
  InternalPlatformRole,
  InternalRole
} from "@/generated/prisma/client";

export const activeBranchCookieName = "sigeco_active_branch";

export const branchStatusLabels: Record<ClinicBranchStatus, string> = {
  active: "Activa",
  preparation: "En preparación",
  inactive: "Inactiva"
};

export function canViewConsolidatedBranches(
  role: InternalRole | InternalPlatformRole | null
) {
  return role === "direccion" || role === "super_admin";
}

/**
 * Un super administrador gobierna el sistema completo, no una sede concreta.
 * Las sedes inactivas siguen fuera de la operación; activas y en preparación
 * forman parte de su alcance sin necesitar una asignación manual por cuenta.
 */
export function hasAutomaticBranchAssignment(
  role: InternalPlatformRole | null,
  status: ClinicBranchStatus
) {
  return role === "super_admin" && status !== "inactive";
}

/** Solo los equipos clínicos confirmados por Dirección rotan entre sedes. */
export function canHoldMultipleActiveBranches(roles: readonly InternalRole[]) {
  if (roles.length <= 1) return true;
  return (
    roles.every((role) => role === "super_admin") ||
    roles.every((role) => role === "medico") ||
    roles.every((role) => role === "enfermeria")
  );
}

export function branchDisplayName(branch: { name: string; city: string }) {
  return branch.name === branch.city ? branch.name : `${branch.name} · ${branch.city}`;
}
