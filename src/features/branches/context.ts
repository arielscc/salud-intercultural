import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { ClinicBranchStatus, InternalRole, InternalUser } from "@/generated/prisma/client";
import { activeBranchCookieName } from "@/features/branches/policy";
import {
  getInternalSessionToken,
  getInternalUserBySessionToken
} from "@/features/internal-auth/session";
import { getBranchesForUser } from "@/modules/database/queries/branches";

export type BranchAssignmentSource = "membership" | "automatic-super-admin";

export type BranchContextBranch = {
  code: string;
  name: string;
  city: string;
  department: string;
  status: ClinicBranchStatus;
  assigned: boolean;
  isDefault: boolean;
  assignmentSource: BranchAssignmentSource;
};

export type BranchRequestContext = {
  user: InternalUser;
  activeBranch: BranchContextBranch;
  assignment: {
    userId: string;
    branchCode: string;
    isDefault: boolean;
    source: BranchAssignmentSource;
  };
  /** Hasta la Tarea 3, el rol operativo sigue almacenado en InternalUser. */
  operationalRole: InternalRole;
  branches: BranchContextBranch[];
  canSwitch: boolean;
};

export type BranchContextFailureReason =
  | "unauthenticated"
  | "password_change_required"
  | "active_branch_required"
  | "invalid_active_branch";

export type BranchContextResolution =
  | { ok: true; context: BranchRequestContext }
  | {
      ok: false;
      reason: BranchContextFailureReason;
      user?: InternalUser;
      branches: BranchContextBranch[];
    };

export class BranchContextUnavailableError extends Error {
  constructor(public readonly reason: BranchContextFailureReason) {
    super("BRANCH_CONTEXT_UNAVAILABLE");
    this.name = "BranchContextUnavailableError";
  }
}

export class BranchContextMismatchError extends Error {
  constructor() {
    super("BRANCH_CONTEXT_MISMATCH");
    this.name = "BranchContextMismatchError";
  }
}

function activeAssignedBranches(branches: readonly BranchContextBranch[]) {
  return branches.filter((branch) => branch.assigned && branch.status === "active");
}

export function selectActiveBranch(
  branches: readonly BranchContextBranch[],
  requestedCode?: string
):
  | { ok: true; branch: BranchContextBranch }
  | { ok: false; reason: "active_branch_required" | "invalid_active_branch" } {
  const selectable = activeAssignedBranches(branches);

  if (requestedCode) {
    const requested = selectable.find((branch) => branch.code === requestedCode);
    return requested
      ? { ok: true, branch: requested }
      : { ok: false, reason: "invalid_active_branch" };
  }

  const defaults = selectable.filter((branch) => branch.isDefault);
  return defaults.length === 1
    ? { ok: true, branch: defaults[0] }
    : { ok: false, reason: "active_branch_required" };
}

const resolveBranchAccess = cache(async () => {
  const token = await getInternalSessionToken();
  if (!token) return { user: null, branches: [] as BranchContextBranch[] };

  const user = await getInternalUserBySessionToken(token);
  if (!user) return { user: null, branches: [] as BranchContextBranch[] };

  const branches = await getBranchesForUser(user.id, user.role);
  return { user, branches };
});

/**
 * Única resolución de la sede operativa de un request.
 *
 * La cookie solo selecciona una membresía activa; no concede acceso. Sin
 * cookie se admite exclusivamente la membresía marcada como predeterminada.
 * Una cookie inválida, dos defaults o la ausencia de default no eligen El Alto
 * ni la primera fila: producen un estado seguro y recuperable.
 */
export const resolveBranchContext = cache(async (): Promise<BranchContextResolution> => {
  const { user, branches } = await resolveBranchAccess();
  if (!user) return { ok: false, reason: "unauthenticated", branches };
  const cookieStore = await cookies();
  const requestedCode = cookieStore.get(activeBranchCookieName)?.value;
  const selection = selectActiveBranch(branches, requestedCode);
  if (!selection.ok) return { ok: false, reason: selection.reason, user, branches };

  const selectable = activeAssignedBranches(branches);
  const activeBranch = selection.branch;
  return {
    ok: true,
    context: {
      user,
      activeBranch,
      assignment: {
        userId: user.id,
        branchCode: activeBranch.code,
        isDefault: activeBranch.isDefault,
        source: activeBranch.assignmentSource
      },
      operationalRole: user.role,
      branches,
      canSwitch: selectable.length > 1
    }
  };
});

export async function getBranchContext(): Promise<BranchRequestContext> {
  const resolution = await resolveBranchContext();
  if (!resolution.ok) throw new BranchContextUnavailableError(resolution.reason);
  return resolution.context;
}

/** Contexto autenticado sin exigir una sede seleccionada; solo para cambiarla. */
export async function getBranchSelectionContext() {
  const { user, branches } = await resolveBranchAccess();
  if (!user) throw new BranchContextUnavailableError("unauthenticated");
  if (user.mustChangePassword) {
    throw new BranchContextUnavailableError("password_change_required");
  }
  return {
    user,
    branches,
    selectableBranches: activeAssignedBranches(branches)
  };
}

/** Un branchCode del cliente es informativo y nunca reemplaza al del contexto. */
export function assertBranchMatchesContext(
  context: BranchRequestContext,
  submittedBranchCode: string
) {
  if (submittedBranchCode !== context.activeBranch.code) {
    throw new BranchContextMismatchError();
  }
}
