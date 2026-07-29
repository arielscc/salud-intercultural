"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { appendAuditEvent } from "@/modules/audit/service";
import { prisma } from "@/modules/database";
import { getCurrentInternalUser } from "@/modules/permissions";
import { verifyPassword } from "@/features/internal-auth/password";
import {
  clearInternalSessionCookie,
  createInternalSession,
  deleteInternalSession,
  getInternalSessionToken,
  setInternalSessionCookie
} from "@/features/internal-auth/session";

function getLoginErrorRedirect(error: "invalid" | "locked" = "invalid") {
  return `/sigeco/login?error=${error}`;
}

export async function loginInternalUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    await appendAuditEvent({
      action: "session.login",
      entityType: "session",
      result: "failure",
      context: { reason: "invalid_credentials" }
    });
    redirect(getLoginErrorRedirect());
  }

  const user = await prisma.internalUser.findUnique({
    where: { email }
  });

  if (!user || !user.active) {
    await appendAuditEvent({
      action: "session.login",
      entityType: "session",
      result: "failure",
      context: { reason: "invalid_credentials" }
    });
    redirect(getLoginErrorRedirect());
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "session.login",
      entityType: "session",
      entityId: user.id,
      result: "denied",
      context: { reason: "account_locked" }
    });
    redirect(getLoginErrorRedirect("locked"));
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

    await appendAuditEvent({
      action: "session.login",
      entityType: "session",
      entityId: user.id,
      result: "failure",
      context: { reason: "invalid_credentials" }
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

  const requestHeaders = await headers();
  const session = await createInternalSession(user.id, requestHeaders.get("user-agent"));
  await setInternalSessionCookie(session.token, session.expiresAt);
  await appendAuditEvent({
    actor: { id: user.id, role: user.role },
    action: "session.login",
    entityType: "session",
    entityId: user.id,
    result: "success"
  });
  redirect(user.mustChangePassword ? "/sigeco/cambiar-contrasena" : "/sigeco");
}

export async function logoutInternalUser() {
  const user = await getCurrentInternalUser();
  const token = await getInternalSessionToken();

  if (token) {
    await deleteInternalSession(token);
  }

  await clearInternalSessionCookie();
  await appendAuditEvent({
    actor: user ? { id: user.id, role: user.role } : null,
    action: "session.logout",
    entityType: "session",
    entityId: user?.id,
    result: user ? "success" : "failure",
    context: user ? undefined : { reason: "missing_session" }
  });
  redirect("/sigeco/login");
}
