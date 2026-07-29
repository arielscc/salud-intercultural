import { redirect } from "next/navigation";
import type { InternalPermission } from "@/generated/prisma/client";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  getInternalSessionByToken,
  getInternalSessionToken,
  getInternalUserBySessionToken
} from "@/features/internal-auth/session";

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
  if (user.mustChangePassword) {
    redirect("/sigeco/cambiar-contrasena");
  }

  return user;
}

export async function getCurrentInternalSession() {
  const token = await getInternalSessionToken();
  if (!token) return null;
  return getInternalSessionByToken(token);
}

export async function requireInternalSession() {
  const session = await getCurrentInternalSession();
  if (!session) redirect("/sigeco/login");
  return session;
}

export async function requirePermission(permission: InternalPermission) {
  const user = await requireInternalUser();

  if (!roleHasPermission(user.role, permission)) {
    redirect("/sigeco");
  }

  return user;
}
