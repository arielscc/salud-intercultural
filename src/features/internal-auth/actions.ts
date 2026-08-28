"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { headers } from "next/headers";
import { appendAuditEvent } from "@/modules/audit/service";
import { prisma } from "@/modules/database";
import { getCurrentInternalUser } from "@/modules/permissions";
import { verifyPassword } from "@/features/internal-auth/password";
import {
  clearInternalSessionCookie,
  clearLoginEmailHint,
  createInternalSession,
  deleteInternalSession,
  getInternalSessionToken,
  setInternalSessionCookie,
  setLoginEmailHint
} from "@/features/internal-auth/session";

/**
 * El correo escrito se conserva en una cookie corta, no en la URL: ahí quedaría
 * en el historial, en los logs y en el `Referer`. `redirect` queda como última
 * línea de cada caso para que TypeScript siga viendo que corta el flujo.
 */
function loginErrorUrl(error: "invalid" | "locked" | "sistema" = "invalid") {
  return `/sigeco/login?error=${error}`;
}

/**
 * Traduce cualquier fallo de infraestructura en un aviso que se entiende.
 *
 * Sin esto, una base que no responde deja la acción sin volver nunca y el botón
 * atascado en «Ingresando…». `unstable_rethrow` deja pasar `redirect` y
 * `notFound`, que Next implementa lanzando: sin esa línea, cada salida normal
 * de la acción se leería como un error de sistema.
 *
 * No se audita el intento: si la base es justamente lo que falló, escribir el
 * evento fallaría igual. Tampoco se dice qué se rompió; a quien entra no le
 * sirve y a quien ataca sí.
 */
export async function loginInternalUser(formData: FormData) {
  try {
    return await attemptInternalLogin(formData);
  } catch (error) {
    unstable_rethrow(error);
    // La cookie no depende de la base, así que el correo escrito sobrevive.
    await setLoginEmailHint(String(formData.get("email") ?? "").trim().toLowerCase());
    redirect(loginErrorUrl("sistema"));
  }
}

async function attemptInternalLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    await appendAuditEvent({
      action: "session.login",
      entityType: "session",
      result: "failure",
      context: { reason: "invalid_credentials" }
    });
    await setLoginEmailHint(email);
    redirect(loginErrorUrl());
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
    await setLoginEmailHint(email);
    redirect(loginErrorUrl());
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
    await setLoginEmailHint(email);
    redirect(loginErrorUrl("locked"));
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
    await setLoginEmailHint(email);
    redirect(loginErrorUrl());
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
  await clearLoginEmailHint();
  await appendAuditEvent({
    actor: { id: user.id, role: user.role },
    action: "session.login",
    entityType: "session",
    entityId: user.id,
    result: "success"
  });
  redirect(user.mustChangePassword ? "/sigeco/cambiar-contrasena" : "/sigeco");
}

/**
 * Cerrar sesión no puede depender de que la base conteste.
 *
 * Borrar la fila de sesión y auditar el cierre necesitan base; borrar la cookie
 * del navegador, no. Si la base falla y se propaga el error, la persona queda
 * con la sesión abierta y un botón muerto —es lo que pasó en staging el
 * 2026-08-27—. Se hace primero lo que siempre funciona y después lo que puede
 * fallar: quien pidió salir, sale.
 */
export async function logoutInternalUser() {
  try {
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
  } catch (error) {
    unstable_rethrow(error);
    // La sesión del servidor queda viva hasta que expire; la del navegador no.
    await clearInternalSessionCookie();
  }

  redirect("/sigeco/login");
}
