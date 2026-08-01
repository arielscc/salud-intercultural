import "server-only";

import { cookies } from "next/headers";
import type { InternalRole } from "@/generated/prisma/client";
import { activeBranchCookieName, defaultBranchCode } from "@/features/branches/policy";
import { getBranchesForUser } from "@/modules/database/queries/branches";

export async function getBranchContext(user: { id: string; role: InternalRole }) {
  const [cookieStore, branches] = await Promise.all([
    cookies(),
    getBranchesForUser(user.id, user.role)
  ]);
  const selectableBranches = branches.filter(
    (branch) => branch.assigned && branch.status === "active"
  );
  const requestedCode = cookieStore.get(activeBranchCookieName)?.value;
  const activeBranch =
    selectableBranches.find((branch) => branch.code === requestedCode) ??
    selectableBranches.find((branch) => branch.isDefault) ??
    selectableBranches.find((branch) => branch.code === defaultBranchCode) ??
    selectableBranches[0];

  if (!activeBranch) {
    throw new Error("El usuario no tiene una sucursal activa asignada.");
  }

  return {
    activeBranch,
    branches,
    canSwitch: selectableBranches.length > 1
  };
}
