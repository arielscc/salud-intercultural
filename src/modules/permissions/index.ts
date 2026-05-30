import { redirect } from "next/navigation";
import type { InternalPermission } from "@/generated/prisma/client";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { getInternalSessionToken, getInternalUserBySessionToken } from "@/features/internal-auth/session";

export async function getCurrentInternalUser() {
  const token = await getInternalSessionToken();

  if (!token) return null;

  return getInternalUserBySessionToken(token);
}

export async function requireInternalUser() {
  const user = await getCurrentInternalUser();

  if (!user) {
    redirect("/sigeco/login");
  }

  return user;
}

export async function requirePermission(permission: InternalPermission) {
  const user = await requireInternalUser();

  if (!roleHasPermission(user.role, permission)) {
    redirect("/sigeco");
  }

  return user;
}
