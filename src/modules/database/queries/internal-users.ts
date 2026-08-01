import type { InternalRole } from "@/generated/prisma/client";
import { assignableInternalRoles } from "@/features/internal-auth/permissions";
import { prisma } from "@/modules/database";
import { defaultBranchCode } from "@/features/branches/policy";

export type InternalUserManagementErrorCode =
  | "EMAIL_EXISTS"
  | "INVALID_ROLE"
  | "USER_NOT_FOUND"
  | "SELF_ROLE_CHANGE"
  | "SELF_DEACTIVATE"
  | "LAST_SUPER_ADMIN";

export class InternalUserManagementError extends Error {
  constructor(public readonly code: InternalUserManagementErrorCode) {
    super(code);
    this.name = "InternalUserManagementError";
  }
}

function assertAssignableRole(role: InternalRole) {
  if (!assignableInternalRoles.includes(role)) {
    throw new InternalUserManagementError("INVALID_ROLE");
  }
}

export function assertInternalUserAccessChange(input: {
  actorId: string;
  targetId: string;
  currentRole: InternalRole;
  currentActive: boolean;
  nextRole: InternalRole;
  nextActive: boolean;
  activeSuperAdmins: number;
}) {
  assertAssignableRole(input.nextRole);
  if (input.actorId === input.targetId && input.nextRole !== input.currentRole) {
    throw new InternalUserManagementError("SELF_ROLE_CHANGE");
  }
  if (input.actorId === input.targetId && !input.nextActive) {
    throw new InternalUserManagementError("SELF_DEACTIVATE");
  }

  const removesSuperAdmin =
    input.currentActive &&
    input.currentRole === "super_admin" &&
    (!input.nextActive || input.nextRole !== "super_admin");
  if (removesSuperAdmin && input.activeSuperAdmins <= 1) {
    throw new InternalUserManagementError("LAST_SUPER_ADMIN");
  }
}

export async function getManagedInternalUsers() {
  const now = new Date();
  return prisma.internalUser.findMany({
    include: {
      branchAssignments: { include: { branch: true } },
      _count: {
        select: {
          sessions: { where: { expiresAt: { gt: now } } }
        }
      }
    },
    orderBy: [{ active: "desc" }, { name: "asc" }, { email: "asc" }]
  });
}

export async function getManagedInternalUserById(userId: string) {
  return prisma.internalUser.findUnique({
    where: { id: userId },
    include: {
      branchAssignments: { include: { branch: true }, orderBy: { isDefault: "desc" } },
      sessions: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function getActiveSessionsForUser(userId: string) {
  return prisma.internalSession.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
}

export async function createManagedInternalUser(input: {
  name: string;
  email: string;
  role: InternalRole;
  passwordHash: string;
}) {
  assertAssignableRole(input.role);
  const existing = await prisma.internalUser.findUnique({
    where: { email: input.email },
    select: { id: true }
  });
  if (existing) throw new InternalUserManagementError("EMAIL_EXISTS");

  return prisma.internalUser.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: input.passwordHash,
      active: true,
      mustChangePassword: true,
      branchAssignments: {
        create: { branchCode: defaultBranchCode, isDefault: true }
      }
    }
  });
}

export async function updateManagedInternalUserAccess(input: {
  actorId: string;
  userId: string;
  role: InternalRole;
  active: boolean;
}) {
  assertAssignableRole(input.role);

  return prisma.$transaction(
    async (tx) => {
      const target = await tx.internalUser.findUnique({ where: { id: input.userId } });
      if (!target) throw new InternalUserManagementError("USER_NOT_FOUND");

      const removesSuperAdmin =
        target.active &&
        target.role === "super_admin" &&
        (!input.active || input.role !== "super_admin");
      const activeSuperAdmins = removesSuperAdmin
        ? await tx.internalUser.count({
            where: { active: true, role: "super_admin" }
          })
        : 0;
      assertInternalUserAccessChange({
        actorId: input.actorId,
        targetId: input.userId,
        currentRole: target.role,
        currentActive: target.active,
        nextRole: input.role,
        nextActive: input.active,
        activeSuperAdmins
      });

      const accessChanged = target.role !== input.role || target.active !== input.active;
      const updated = await tx.internalUser.update({
        where: { id: input.userId },
        data: { role: input.role, active: input.active }
      });
      let revokedSessions = 0;

      if (accessChanged) {
        const revoked = await tx.internalSession.deleteMany({ where: { userId: input.userId } });
        revokedSessions = revoked.count;
      }

      return { user: updated, revokedSessions };
    },
    { isolationLevel: "Serializable" }
  );
}

export async function requireInternalUserPasswordChange(userId: string) {
  return prisma.internalUser.update({
    where: { id: userId },
    data: { mustChangePassword: true }
  });
}

export async function unlockManagedInternalUser(userId: string) {
  return prisma.internalUser.update({
    where: { id: userId },
    data: { failedAttempts: 0, lockedUntil: null }
  });
}

export async function revokeManagedInternalUserSessions(userId: string) {
  return prisma.internalSession.deleteMany({ where: { userId } });
}

export async function revokeOwnInternalSession(userId: string, sessionId: string) {
  return prisma.internalSession.deleteMany({
    where: { id: sessionId, userId }
  });
}

export async function updateInternalUserPassword(input: {
  userId: string;
  currentSessionId: string;
  passwordHash: string;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.internalUser.update({
      where: { id: input.userId },
      data: {
        passwordHash: input.passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        failedAttempts: 0,
        lockedUntil: null
      }
    });
    const revoked = await tx.internalSession.deleteMany({
      where: { userId: input.userId, id: { not: input.currentSessionId } }
    });
    return { user, revokedSessions: revoked.count };
  });
}
