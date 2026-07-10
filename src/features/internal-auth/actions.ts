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

function getLoginErrorRedirect(email: string, error: "invalid" | "locked" = "invalid") {
  // Se conserva el email para no obligar a reescribirlo; la contraseña nunca
  // viaja ni se repone. El mensaje y el comportamiento son identicos exista o
  // no la cuenta, para no permitir enumerar usuarios.
  const params = new URLSearchParams({ error });

  if (email) {
    params.set("email", email);
  }

  return `/sigeco/login?${params.toString()}`;
}

export async function loginInternalUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(getLoginErrorRedirect(email));
  }

  const user = await prisma.internalUser.findUnique({
    where: { email }
  });

  if (!user || !user.active) {
    redirect(getLoginErrorRedirect(email));
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    redirect(getLoginErrorRedirect(email, "locked"));
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

    redirect(getLoginErrorRedirect(email));
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
