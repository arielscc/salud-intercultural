import type {
  InternalPlatformRole,
  InternalRole,
  Prisma
} from "@/generated/prisma/client";
import { assignableInternalRoles } from "@/features/internal-auth/permissions";
import { prisma } from "@/modules/database";

export type InternalUserManagementErrorCode =
  | "EMAIL_EXISTS"
  | "INVALID_ROLE"
  | "USER_NOT_FOUND"
  | "SELF_ROLE_CHANGE"
  | "SELF_DEACTIVATE"
  | "LAST_SUPER_ADMIN"
  | "INVALID_BRANCH_ASSIGNMENT";

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

async function ensureSuperAdminBranchAssignments(
  tx: Prisma.TransactionClient,
  userId: string,
  preferredBranchCode: string
) {
  const branches = await tx.clinicBranch.findMany({
    where: { status: { not: "inactive" } },
    select: { code: true, status: true }
  });

  await tx.internalUserBranch.createMany({
    data: branches.map((branch) => ({
      userId,
      branchCode: branch.code,
      role: "super_admin" as const,
      active: true
    })),
    skipDuplicates: true
  });
  await tx.internalUserBranch.updateMany({
    where: { userId, branchCode: { in: branches.map((branch) => branch.code) } },
    data: { role: "super_admin", active: true }
  });

  const activeDefault = await tx.internalUserBranch.findFirst({
    where: { userId, isDefault: true, branch: { status: "active" } },
    select: { branchCode: true }
  });
  if (activeDefault) return;

  const preferred = branches.find(
    (branch) => branch.code === preferredBranchCode && branch.status === "active"
  );
  if (!preferred) throw new InternalUserManagementError("INVALID_BRANCH_ASSIGNMENT");

  await tx.internalUserBranch.updateMany({ where: { userId }, data: { isDefault: false } });
  await tx.internalUserBranch.update({
    where: { userId_branchCode: { userId, branchCode: preferred.code } },
    data: { isDefault: true }
  });
}

export function assertInternalUserAccessChange(input: {
  actorId: string;
  targetId: string;
  currentPlatformRole: InternalPlatformRole | null;
  currentActive: boolean;
  nextPlatformRole: InternalPlatformRole | null;
  nextActive: boolean;
  activeSuperAdmins: number;
}) {
  if (
    input.actorId === input.targetId &&
    input.nextPlatformRole !== input.currentPlatformRole
  ) {
    throw new InternalUserManagementError("SELF_ROLE_CHANGE");
  }
  if (input.actorId === input.targetId && !input.nextActive) {
    throw new InternalUserManagementError("SELF_DEACTIVATE");
  }

  const removesSuperAdmin =
    input.currentActive &&
    input.currentPlatformRole === "super_admin" &&
    (!input.nextActive || input.nextPlatformRole !== "super_admin");
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
  branchCode: string;
}) {
  assertAssignableRole(input.role);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.internalUser.findUnique({
      where: { email: input.email },
      select: { id: true }
    });
    if (existing) throw new InternalUserManagementError("EMAIL_EXISTS");

    const user = await tx.internalUser.create({
      data: {
        name: input.name,
        email: input.email,
        platformRole: input.role === "super_admin" ? "super_admin" : null,
        passwordHash: input.passwordHash,
        active: true,
        mustChangePassword: true
      }
    });

    if (input.role === "super_admin") {
      await ensureSuperAdminBranchAssignments(tx, user.id, input.branchCode);
    } else {
      await tx.internalUserBranch.create({
        data: {
          userId: user.id,
          branchCode: input.branchCode,
          role: input.role,
          active: true,
          isDefault: true
        }
      });
    }

    return user;
  });
}

export async function updateManagedInternalUserAccess(input: {
  actorId: string;
  userId: string;
  platformRole: InternalPlatformRole | null;
  staffRole: Exclude<InternalRole, "super_admin">;
  active: boolean;
  defaultBranchCode: string;
}) {
  assertAssignableRole(input.staffRole);

  return prisma.$transaction(
    async (tx) => {
      const target = await tx.internalUser.findUnique({ where: { id: input.userId } });
      if (!target) throw new InternalUserManagementError("USER_NOT_FOUND");

      const removesSuperAdmin =
        target.active &&
        target.platformRole === "super_admin" &&
        (!input.active || input.platformRole !== "super_admin");
      const activeSuperAdmins = removesSuperAdmin
        ? await tx.internalUser.count({
            where: { active: true, platformRole: "super_admin" }
          })
        : 0;
      assertInternalUserAccessChange({
        actorId: input.actorId,
        targetId: input.userId,
        currentPlatformRole: target.platformRole,
        currentActive: target.active,
        nextPlatformRole: input.platformRole,
        nextActive: input.active,
        activeSuperAdmins
      });
      const previousMemberships = await tx.internalUserBranch.findMany({
        where: { userId: input.userId },
        select: { branchCode: true, role: true, active: true }
      });

      const accessChanged =
        target.platformRole !== input.platformRole || target.active !== input.active;
      const updated = await tx.internalUser.update({
        where: { id: input.userId },
        data: { platformRole: input.platformRole, active: input.active }
      });
      if (input.platformRole === "super_admin") {
        await ensureSuperAdminBranchAssignments(
          tx,
          input.userId,
          input.defaultBranchCode
        );
      } else if (target.platformRole === "super_admin") {
        await tx.internalUserBranch.updateMany({
          where: { userId: input.userId },
          data: {
            role: input.staffRole,
            active: false,
            isDefault: false
          }
        });
        await tx.internalUserBranch.update({
          where: {
            userId_branchCode: {
              userId: input.userId,
              branchCode: input.defaultBranchCode
            }
          },
          data: {
            role: input.staffRole,
            active: true,
            isDefault: true
          }
        });
      }
      let revokedSessions = 0;

      if (accessChanged) {
        const revoked = await tx.internalSession.deleteMany({ where: { userId: input.userId } });
        revokedSessions = revoked.count;
      }

      const currentMemberships = await tx.internalUserBranch.findMany({
        where: { userId: input.userId },
        select: { branchCode: true, role: true, active: true }
      });
      const previousByBranch = new Map(
        previousMemberships.map((membership) => [membership.branchCode, membership])
      );
      const membershipRoleChanges = currentMemberships.flatMap((membership) => {
        const previous = previousByBranch.get(membership.branchCode);
        return previous && previous.role !== membership.role
          ? [{ branchCode: membership.branchCode, from: previous.role, to: membership.role }]
          : [];
      });
      const activatedMemberships = currentMemberships
        .filter((membership) => {
          const previous = previousByBranch.get(membership.branchCode);
          return membership.active && !previous?.active;
        })
        .map((membership) => membership.branchCode);
      const deactivatedMemberships = currentMemberships
        .filter((membership) => {
          const previous = previousByBranch.get(membership.branchCode);
          return !membership.active && previous?.active;
        })
        .map((membership) => membership.branchCode);

      return {
        user: updated,
        revokedSessions,
        membershipRoleChanges,
        activatedMemberships,
        deactivatedMemberships
      };
    },
    { isolationLevel: "Serializable" }
  );
}

export async function updateManagedInternalUserProfile(input: {
  userId: string;
  name: string;
}) {
  const target = await prisma.internalUser.findUnique({
    where: { id: input.userId },
    select: { id: true }
  });
  if (!target) throw new InternalUserManagementError("USER_NOT_FOUND");

  return prisma.internalUser.update({
    where: { id: input.userId },
    data: { name: input.name }
  });
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
