"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/modules/database";
import { verifyPassword } from "@/features/internal-auth/password";
import {
  clearInternalSessionCookie,
  createInternalSession,
  deleteInternalSession,
  getInternalSessionToken,
  setInternalSessionCookie
} from "@/features/internal-auth/session";

function getLoginErrorRedirect() {
  return "/sigeco/login?error=invalid";
}

export async function loginInternalUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(getLoginErrorRedirect());
  }

  const user = await prisma.internalUser.findUnique({
    where: { email }
  });

  if (!user || !user.active) {
    redirect(getLoginErrorRedirect());
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    redirect("/sigeco/login?error=locked");
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    const failedAttempts = user.failedAttempts + 1;
    const lockMinutes = Number(process.env.INTERNAL_LOCK_MINUTES ?? 10);

    await prisma.internalUser.update({
      where: { id: user.id },
      data: {
        failedAttempts,
        lockedUntil:
          failedAttempts >= 5 ? new Date(Date.now() + lockMinutes * 60 * 1000) : null
      }
    });

    redirect(getLoginErrorRedirect());
  }

  await prisma.internalUser.update({
    where: { id: user.id },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    }
  });

  const session = await createInternalSession(user.id);
  await setInternalSessionCookie(session.token, session.expiresAt);
  redirect("/sigeco");
}

export async function logoutInternalUser() {
  const token = await getInternalSessionToken();

  if (token) {
    await deleteInternalSession(token);
  }

  await clearInternalSessionCookie();
  redirect("/sigeco/login");
}
