import "server-only";

import { cookies } from "next/headers";
import type { InternalRole } from "@/generated/prisma/client";
import { activeBranchCookieName, defaultBranchCode } from "@/features/branches/policy";
import { getBranchesForUser } from "@/modules/database/queries/branches";

/**
 * Sucursal activa del request, sin exigir que exista.
 *
 * La cookie solo puede *elegir* entre las sedes asignadas y abiertas: nunca
 * agrega una. Escribirla a mano con otro código no habilita nada, porque un
 * código que no está en esa lista simplemente no se encuentra y se cae en la
 * predeterminada. Esto importa desde que la activación de módulos es por
 * sucursal: la sede resuelta aquí decide qué está encendido.
 */
export async function resolveBranchContext(user: { id: string; role: InternalRole }) {
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

  return {
    activeBranch,
    branches,
    canSwitch: selectableBranches.length > 1
  };
}

export async function getBranchContext(user: { id: string; role: InternalRole }) {
  const context = await resolveBranchContext(user);

  if (!context.activeBranch) {
    throw new Error("El usuario no tiene una sucursal activa asignada.");
  }

  return { ...context, activeBranch: context.activeBranch };
}
