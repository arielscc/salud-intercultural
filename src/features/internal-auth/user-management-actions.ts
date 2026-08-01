"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  auditedResult,
  denyAuditedAction,
  runAuditedAction
} from "@/modules/audit/service";
import {
  createManagedInternalUser,
  InternalUserManagementError,
  requireInternalUserPasswordChange,
  revokeManagedInternalUserSessions,
  revokeOwnInternalSession,
  unlockManagedInternalUser,
  updateInternalUserPassword,
  updateManagedInternalUserAccess
} from "@/modules/database/queries/internal-users";
import { clearInternalSessionCookie } from "@/features/internal-auth/session";
import { hashPassword, verifyPassword } from "@/features/internal-auth/password";
import {
  changeInternalPasswordSchema,
  createInternalUserSchema,
  internalSessionTargetSchema,
  internalUserTargetSchema,
  updateInternalUserAccessSchema
} from "@/features/internal-auth/schemas/user-management.schema";
import { requireInternalSession } from "@/modules/permissions";
import { replaceUserBranchAssignments } from "@/modules/database/queries/branches";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function managementErrorCode(error: unknown) {
  return error instanceof InternalUserManagementError ? error.code.toLowerCase() : "invalid";
}

export async function createManagedInternalUserAction(formData: FormData) {
  const user = await runAuditedAction(
    {
      permission: "users_manage",
      action: "user.create",
      entityType: "internal_user"
    },
    async () => {
      const parsed = createInternalUserSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect("/sigeco/usuarios?error=invalid-user");

      try {
        const created = await createManagedInternalUser({
          name: parsed.data.name,
          email: parsed.data.email,
          role: parsed.data.role,
          passwordHash: await hashPassword(parsed.data.temporaryPassword)
        });
        return auditedResult(created, {
          entityId: created.id,
          context: { assignedRole: created.role }
        });
      } catch (error) {
        redirect(`/sigeco/usuarios?error=${managementErrorCode(error)}`);
      }
    }
  );

  revalidatePath("/sigeco/usuarios");
  redirect(`/sigeco/usuarios/${user.id}?aviso=usuario-creado`);
}

export async function updateManagedInternalUserAccessAction(formData: FormData) {
  const targetId = String(formData.get("userId") ?? "");
  await runAuditedAction(
    {
      permission: "users_manage",
      action: "user.access.update",
      entityType: "internal_user",
      entityId: targetId || undefined
    },
    async (actor) => {
      const parsed = updateInternalUserAccessSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect(`/sigeco/usuarios/${targetId}?error=invalid-access`);

      try {
        const result = await updateManagedInternalUserAccess({
          actorId: actor.id,
          userId: parsed.data.userId,
          role: parsed.data.role,
          active: parsed.data.active
        });
        return auditedResult(result, {
          entityId: result.user.id,
          context: {
            assignedRole: result.user.role,
            active: result.user.active,
            revokedCount: result.revokedSessions
          }
        });
      } catch (error) {
        redirect(`/sigeco/usuarios/${targetId}?error=${managementErrorCode(error)}`);
      }
    }
  );

  revalidatePath("/sigeco/usuarios");
  revalidatePath(`/sigeco/usuarios/${targetId}`);
  redirect(`/sigeco/usuarios/${targetId}?aviso=acceso-actualizado`);
}

export async function updateManagedInternalUserBranchesAction(formData: FormData) {
  const targetId = String(formData.get("userId") ?? "");
  const branchCodes = formData.getAll("branchCodes").map(String).filter(Boolean);
  const defaultBranchCode = String(formData.get("defaultBranchCode") ?? "");
  if (!targetId || !defaultBranchCode || branchCodes.length === 0) {
    redirect(`/sigeco/usuarios/${targetId}?error=invalid-branches`);
  }

  await runAuditedAction(
    {
      permission: "users_manage",
      action: "user.branches.update",
      entityType: "internal_user",
      entityId: targetId,
      context: { branchCodes, defaultBranchCode }
    },
    async () => {
      await replaceUserBranchAssignments({ userId: targetId, branchCodes, defaultBranchCode });
      return auditedResult(targetId, { entityId: targetId });
    }
  );

  revalidatePath(`/sigeco/usuarios/${targetId}`);
  redirect(`/sigeco/usuarios/${targetId}?aviso=sucursales-actualizadas`);
}

export async function requireInternalUserPasswordChangeAction(formData: FormData) {
  const targetId = String(formData.get("userId") ?? "");
  await runAuditedAction(
    {
      permission: "users_manage",
      action: "user.password_change.require",
      entityType: "internal_user",
      entityId: targetId || undefined
    },
    async () => {
      const parsed = internalUserTargetSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect("/sigeco/usuarios?error=invalid-user");
      const user = await requireInternalUserPasswordChange(parsed.data.userId);
      return auditedResult(user, {
        entityId: user.id,
        context: { forceChange: true }
      });
    }
  );

  revalidatePath(`/sigeco/usuarios/${targetId}`);
}

export async function unlockManagedInternalUserAction(formData: FormData) {
  const targetId = String(formData.get("userId") ?? "");
  await runAuditedAction(
    {
      permission: "users_manage",
      action: "user.unlock",
      entityType: "internal_user",
      entityId: targetId || undefined
    },
    async () => {
      const parsed = internalUserTargetSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect("/sigeco/usuarios?error=invalid-user");
      const user = await unlockManagedInternalUser(parsed.data.userId);
      return auditedResult(user, { entityId: user.id });
    }
  );

  revalidatePath(`/sigeco/usuarios/${targetId}`);
}

export async function revokeManagedInternalUserSessionsAction(formData: FormData) {
  const targetId = String(formData.get("userId") ?? "");
  const revokedOwnSessions = await runAuditedAction(
    {
      permission: "users_manage",
      action: "user.sessions.revoke",
      entityType: "internal_user",
      entityId: targetId || undefined
    },
    async (actor) => {
      const parsed = internalUserTargetSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect("/sigeco/usuarios?error=invalid-user");
      const revoked = await revokeManagedInternalUserSessions(parsed.data.userId);
      return auditedResult(actor.id === parsed.data.userId, {
        entityId: parsed.data.userId,
        context: { revokedCount: revoked.count }
      });
    }
  );

  if (revokedOwnSessions) {
    await clearInternalSessionCookie();
    redirect("/sigeco/login");
  }
  revalidatePath(`/sigeco/usuarios/${targetId}`);
}

export async function revokeOwnInternalSessionAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const closedCurrentSession = await runAuditedAction(
    {
      permission: "internal_access",
      action: "session.revoke",
      entityType: "session",
      entityId: sessionId || undefined
    },
    async (actor) => {
      const parsed = internalSessionTargetSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect("/sigeco/mi-cuenta?error=invalid-session");
      const currentSession = await requireInternalSession();
      const deleted = await revokeOwnInternalSession(actor.id, parsed.data.sessionId);
      if (deleted.count !== 1) denyAuditedAction("session_not_owned");
      return auditedResult(currentSession.id === parsed.data.sessionId, {
        entityId: parsed.data.sessionId
      });
    }
  );

  if (closedCurrentSession) {
    await clearInternalSessionCookie();
    redirect("/sigeco/login");
  }
  revalidatePath("/sigeco/mi-cuenta");
}

export async function changeOwnInternalPasswordAction(formData: FormData) {
  const destination = formData.get("returnTo") === "forced" ? "forced" : "account";
  const errorPath =
    destination === "forced" ? "/sigeco/cambiar-contrasena" : "/sigeco/mi-cuenta";

  await runAuditedAction(
    {
      permission: "internal_access",
      action: "user.password.change",
      entityType: "internal_user"
    },
    async (actor) => {
      const parsed = changeInternalPasswordSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect(`${errorPath}?error=invalid-password`);

      const currentSession = await requireInternalSession();
      const currentPasswordIsValid = await verifyPassword(
        parsed.data.currentPassword,
        currentSession.user.passwordHash
      );
      if (!currentPasswordIsValid) redirect(`${errorPath}?error=current-password`);
      if (await verifyPassword(parsed.data.newPassword, currentSession.user.passwordHash)) {
        redirect(`${errorPath}?error=same-password`);
      }

      const result = await updateInternalUserPassword({
        userId: actor.id,
        currentSessionId: currentSession.id,
        passwordHash: await hashPassword(parsed.data.newPassword)
      });
      return auditedResult(result, {
        entityId: actor.id,
        context: { revokedCount: result.revokedSessions }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/mi-cuenta");
  redirect(
    destination === "forced"
      ? "/sigeco?aviso=contrasena-actualizada"
      : "/sigeco/mi-cuenta?aviso=contrasena-actualizada"
  );
}
