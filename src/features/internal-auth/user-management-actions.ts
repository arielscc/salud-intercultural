"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  auditedResult,
  denyAuditedAction,
  runAuditedAction
} from "@/modules/audit/service";
import type { ZodError } from "zod";
import {
  createManagedInternalUser,
  InternalUserManagementError,
  requireInternalUserPasswordChange,
  revokeManagedInternalUserSessions,
  revokeOwnInternalSession,
  unlockManagedInternalUser,
  updateInternalUserPassword,
  updateManagedInternalUserAccess,
  updateManagedInternalUserProfile
} from "@/modules/database/queries/internal-users";
import { clearInternalSessionCookie } from "@/features/internal-auth/session";
import { hashPassword, verifyPassword } from "@/features/internal-auth/password";
import {
  changeInternalPasswordSchema,
  branchMembershipSchema,
  createInternalUserSchema,
  internalSessionTargetSchema,
  internalUserTargetSchema,
  updateInternalUserAccessSchema,
  updateInternalUserProfileSchema
} from "@/features/internal-auth/schemas/user-management.schema";
import { requireInternalSession } from "@/modules/permissions";
import { replaceUserBranchAssignments } from "@/modules/database/queries/branches";
import { canHoldMultipleActiveBranches } from "@/features/branches/policy";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function managementErrorCode(error: unknown) {
  return error instanceof InternalUserManagementError ? error.code.toLowerCase() : "invalid";
}

function hasFieldIssue(error: ZodError, field: string) {
  return error.issues.some((issue) => issue.path[0] === field);
}

export async function createManagedInternalUserAction(formData: FormData) {
  const user = await runAuditedAction(
    {
      permission: "users_manage",
      auditScope: "platform",
      action: "user.create",
      entityType: "internal_user"
    },
    async (_actor, branchContext) => {
      const parsed = createInternalUserSchema.safeParse(parseFormData(formData));
      if (!parsed.success) {
        const code = hasFieldIssue(parsed.error, "temporaryPassword")
          ? "weak-password"
          : "invalid-user";
        redirect(`/sigeco/usuarios?error=${code}`);
      }

      try {
        const created = await createManagedInternalUser({
          name: parsed.data.name,
          email: parsed.data.email,
          role: parsed.data.role,
          passwordHash: await hashPassword(parsed.data.temporaryPassword),
          branchCode: branchContext.activeBranch.code
        });
        return auditedResult(created, {
          entityId: created.id,
          context: {
            assignedRole: parsed.data.role,
            platformRole: created.platformRole
          }
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
      auditScope: "platform",
      action: "user.access.update",
      entityType: "internal_user",
      entityId: targetId || undefined
    },
    async (actor, branchContext) => {
      const parsed = updateInternalUserAccessSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect(`/sigeco/usuarios/${targetId}?error=invalid-access`);

      try {
        const result = await updateManagedInternalUserAccess({
          actorId: actor.id,
          userId: parsed.data.userId,
          platformRole:
            parsed.data.platformRole === "super_admin" ? "super_admin" : null,
          staffRole: parsed.data.staffRole,
          active: parsed.data.active,
          defaultBranchCode: branchContext.activeBranch.code
        });
        return auditedResult(result, {
          entityId: result.user.id,
          context: {
            platformRole: result.user.platformRole,
            active: result.user.active,
            revokedCount: result.revokedSessions,
            membershipRoleChanges: result.membershipRoleChanges,
            activatedMemberships: result.activatedMemberships,
            deactivatedMemberships: result.deactivatedMemberships
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

export async function updateManagedInternalUserProfileAction(formData: FormData) {
  const targetId = String(formData.get("userId") ?? "");
  await runAuditedAction(
    {
      permission: "users_manage",
      auditScope: "platform",
      action: "user.profile.update",
      entityType: "internal_user",
      entityId: targetId || undefined
    },
    async () => {
      const parsed = updateInternalUserProfileSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect(`/sigeco/usuarios/${targetId}?error=invalid-name`);

      try {
        const updated = await updateManagedInternalUserProfile({
          userId: parsed.data.userId,
          name: parsed.data.name
        });
        return auditedResult(updated, { entityId: updated.id });
      } catch (error) {
        redirect(`/sigeco/usuarios/${targetId}?error=${managementErrorCode(error)}`);
      }
    }
  );

  revalidatePath("/sigeco/usuarios");
  revalidatePath(`/sigeco/usuarios/${targetId}`);
  redirect(`/sigeco/usuarios/${targetId}?aviso=nombre-actualizado`);
}

export async function updateManagedInternalUserBranchesAction(formData: FormData) {
  const targetId = String(formData.get("userId") ?? "");
  const branchCodes = [...new Set(formData.getAll("branchCodes").map(String).filter(Boolean))];
  const defaultBranchCode = String(formData.get("defaultBranchCode") ?? "");
  if (!targetId || !defaultBranchCode || branchCodes.length === 0) {
    redirect(`/sigeco/usuarios/${targetId}?error=invalid-branches`);
  }
  const parsedMemberships = branchMembershipSchema.array().safeParse(
    branchCodes.map((branchCode) => ({
      branchCode,
      role: String(formData.get(`role:${branchCode}`) ?? ""),
      active: formData.get(`active:${branchCode}`) === "true"
    }))
  );
  if (!parsedMemberships.success) {
    redirect(`/sigeco/usuarios/${targetId}?error=invalid-branches`);
  }
  if (
    !canHoldMultipleActiveBranches(
      parsedMemberships.data
        .filter((membership) => membership.active)
        .map((membership) => membership.role)
    )
  ) {
    redirect(`/sigeco/usuarios/${targetId}?error=multi-branch-clinical-only`);
  }

  await runAuditedAction(
    {
      permission: "users_manage",
      auditScope: "platform",
      action: "user.branches.update",
      entityType: "internal_user",
      entityId: targetId,
      context: { branchCodes, defaultBranchCode }
    },
    async () => {
      const changes = await replaceUserBranchAssignments({
        userId: targetId,
        memberships: parsedMemberships.data,
        defaultBranchCode
      });
      const previous = new Map(changes.previous.map((item) => [item.branchCode, item]));
      const activated: string[] = [];
      const deactivated: string[] = [];
      const roleChanges: Array<{ branchCode: string; from: string; to: string }> = [];
      for (const membership of changes.current) {
        const before = previous.get(membership.branchCode);
        if (membership.active && !before?.active) activated.push(membership.branchCode);
        if (!membership.active && before?.active) deactivated.push(membership.branchCode);
        if (before && before.role !== membership.role) {
          roleChanges.push({
            branchCode: membership.branchCode,
            from: before.role,
            to: membership.role
          });
        }
      }
      const previousDefault = changes.previous.find((item) => item.isDefault)?.branchCode;
      return auditedResult(targetId, {
        entityId: targetId,
        context: {
          activated,
          deactivated,
          roleChanges,
          defaultChanged: previousDefault !== defaultBranchCode,
          previousDefault,
          defaultBranchCode
        }
      });
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
      auditScope: "platform",
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
      auditScope: "platform",
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
      auditScope: "platform",
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
      auditScope: "platform",
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
      entityType: "internal_user",
      branchless: true
    },
    async (actor) => {
      const parsed = changeInternalPasswordSchema.safeParse(parseFormData(formData));
      if (!parsed.success) {
        const code = hasFieldIssue(parsed.error, "newPassword")
          ? "weak-password"
          : hasFieldIssue(parsed.error, "confirmPassword")
            ? "password-mismatch"
            : "invalid-password";
        redirect(`${errorPath}?error=${code}`);
      }

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
