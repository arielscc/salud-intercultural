import type {
  InternalPlatformRole,
  InternalRole,
  Prisma
} from "@/generated/prisma/client";
import {
  canHoldMultipleActiveBranches,
  canViewConsolidatedBranches,
  hasAutomaticBranchAssignment
} from "@/features/branches/policy";
import { prisma, withDatabaseError } from "@/modules/database";

const branchSelect = {
  code: true,
  name: true,
  city: true,
  department: true,
  status: true
} satisfies Prisma.ClinicBranchSelect;

export async function getBranchesForUser(
  userId: string,
  platformRole: InternalPlatformRole | null
) {
  return withDatabaseError("getBranchesForUser", async () => {
    const assignments = await prisma.internalUserBranch.findMany({
      where: { userId },
      select: {
        active: true,
        isDefault: true,
        role: true,
        branch: { select: branchSelect }
      },
      orderBy: [{ isDefault: "desc" }, { branch: { name: "asc" } }]
    });

    const assigned = assignments.map((assignment) => ({
      ...assignment.branch,
      role: assignment.role,
      membershipActive: assignment.active,
      isDefault: assignment.isDefault,
      assigned: assignment.active,
      assignmentSource: "membership" as const
    }));

    if (!hasAutomaticBranchAssignment(platformRole, "active")) return assigned;

    const assignedCodes = assigned.map((branch) => branch.code);
    const otherBranches = await prisma.clinicBranch.findMany({
      where: { code: { notIn: assignedCodes } },
      select: branchSelect,
      orderBy: { name: "asc" }
    });

    const branches = [
      ...assigned,
      ...otherBranches.map((branch) => ({
        ...branch,
        role: "super_admin" as const,
        membershipActive: true,
        isDefault: false,
        assigned: true,
        assignmentSource: "automatic-super-admin" as const
      }))
    ];

    return branches.map((branch) => ({
      ...branch,
      role: "super_admin" as const,
      membershipActive: branch.status !== "inactive",
      assigned: hasAutomaticBranchAssignment(platformRole, branch.status)
    }));
  });
}

export async function getBranchByCode(code: string) {
  return withDatabaseError("getBranchByCode", () =>
    prisma.clinicBranch.findUnique({ where: { code }, select: branchSelect })
  );
}

export async function getConfigurableBranches() {
  return withDatabaseError("getConfigurableBranches", () =>
    prisma.clinicBranch.findMany({
      where: { status: { not: "inactive" } },
      select: branchSelect,
      orderBy: { name: "asc" }
    })
  );
}

/**
 * Traslada la única sede de trabajo de un médico o enfermera. Las demás
 * asignaciones permanecen activas para consulta y no pierden información.
 */
export async function setClinicalWorkingBranch(input: {
  userId: string;
  branchCode: string;
}) {
  return withDatabaseError("setClinicalWorkingBranch", () =>
    prisma.$transaction(async (tx) => {
      const target = await tx.internalUserBranch.findFirst({
        where: {
          userId: input.userId,
          branchCode: input.branchCode,
          active: true,
          role: { in: ["medico", "enfermeria"] },
          branch: { status: "active" }
        },
        select: { branchCode: true, role: true }
      });
      if (!target) throw new Error("CLINICAL_WORK_BRANCH_NOT_ALLOWED");

      const previous = await tx.internalUserBranch.findFirst({
        where: { userId: input.userId, isDefault: true },
        select: { branchCode: true }
      });
      await tx.internalUserBranch.updateMany({
        where: { userId: input.userId },
        data: { isDefault: false }
      });
      await tx.internalUserBranch.update({
        where: {
          userId_branchCode: {
            userId: input.userId,
            branchCode: target.branchCode
          }
        },
        data: { isDefault: true }
      });

      return {
        previousBranchCode: previous ? previous.branchCode : null,
        branchCode: target.branchCode,
        role: target.role
      };
    })
  );
}

export async function replaceUserBranchAssignments(input: {
  userId: string;
  memberships: Array<{ branchCode: string; role: InternalRole; active: boolean }>;
  defaultBranchCode: string;
}) {
  return withDatabaseError("replaceUserBranchAssignments", () =>
    prisma.$transaction(async (tx) => {
      const target = await tx.internalUser.findUnique({
        where: { id: input.userId },
        select: { platformRole: true }
      });
      if (!target) throw new Error("USER_NOT_FOUND");

      const configurableBranches = await tx.clinicBranch.findMany({
        where: { status: { not: "inactive" } },
        select: { code: true, status: true }
      });
      const configurableCodes = new Set(configurableBranches.map((branch) => branch.code));
      const requested =
        target.platformRole === "super_admin"
          ? configurableBranches.map((branch) => ({
              branchCode: branch.code,
              role: "super_admin" as const,
              active: true
            }))
          : input.memberships;
      const unique = new Map(requested.map((membership) => [membership.branchCode, membership]));
      if (unique.size !== requested.length) throw new Error("INVALID_BRANCH_ASSIGNMENT");
      if ([...unique.keys()].some((branchCode) => !configurableCodes.has(branchCode))) {
        throw new Error("INVALID_BRANCH_ASSIGNMENT");
      }
      if (
        !target.platformRole &&
        [...unique.values()].some((membership) => membership.role === "super_admin")
      ) {
        throw new Error("INVALID_BRANCH_ASSIGNMENT");
      }
      const defaultMembership = unique.get(input.defaultBranchCode);
      const defaultBranch = configurableBranches.find(
        (branch) => branch.code === input.defaultBranchCode
      );
      if (!defaultMembership?.active || defaultBranch?.status !== "active") {
        throw new Error("DEFAULT_BRANCH_NOT_ASSIGNED");
      }
      if (!target.platformRole && ![...unique.values()].some((membership) => membership.active)) {
        throw new Error("INVALID_BRANCH_ASSIGNMENT");
      }
      if (
        !target.platformRole &&
        !canHoldMultipleActiveBranches(
          [...unique.values()]
            .filter((membership) => membership.active)
            .map((membership) => membership.role)
        )
      ) {
        throw new Error("MULTI_BRANCH_ROLE_REQUIRES_CLINICAL_ROTATION");
      }

      const previous = await tx.internalUserBranch.findMany({
        where: { userId: input.userId },
        select: { branchCode: true, role: true, active: true, isDefault: true }
      });

      await tx.internalUserBranch.updateMany({
        where: { userId: input.userId },
        data: { active: false, isDefault: false }
      });
      for (const membership of unique.values()) {
        await tx.internalUserBranch.upsert({
          where: {
            userId_branchCode: {
              userId: input.userId,
              branchCode: membership.branchCode
            }
          },
          create: {
            userId: input.userId,
            branchCode: membership.branchCode,
            role: membership.role,
            active: membership.active,
            isDefault: membership.branchCode === input.defaultBranchCode
          },
          update: {
            role: membership.role,
            active: membership.active,
            isDefault: membership.branchCode === input.defaultBranchCode
          }
        });
      }

      const current = await tx.internalUserBranch.findMany({
        where: { userId: input.userId },
        select: { branchCode: true, role: true, active: true, isDefault: true }
      });
      return { previous, current };
    })
  );
}

export async function getBranchComparisonReport(role: InternalRole) {
  if (!canViewConsolidatedBranches(role)) {
    throw new Error("CONSOLIDATED_BRANCH_REPORT_DENIED");
  }

  return withDatabaseError("getBranchComparisonReport", async () => {
    const branches = await prisma.clinicBranch.findMany({ orderBy: { name: "asc" } });
    const rows = await Promise.all(
      branches.map(async (branch) => {
        const [visits, syntheticVisits, sales, payments, purchases, cashSessions, balances] =
          await Promise.all([
            prisma.visit.count({ where: { branchCode: branch.code, isTestData: false } }),
            prisma.visit.count({ where: { branchCode: branch.code, isTestData: true } }),
            prisma.sale.aggregate({
              where: { branchCode: branch.code, visit: { isTestData: false } },
              _count: true,
              _sum: { totalCents: true, paidCents: true }
            }),
            prisma.payment.aggregate({
              where: { branchCode: branch.code, visit: { isTestData: false } },
              _count: true,
              _sum: { amountCents: true }
            }),
            prisma.purchase.aggregate({
              where: { branchCode: branch.code },
              _count: true,
              _sum: { totalCents: true }
            }),
            prisma.cashSession.groupBy({
              by: ["status"],
              where: { branchCode: branch.code },
              _count: { _all: true }
            }),
            prisma.branchInventoryBalance.aggregate({
              where: { branchCode: branch.code },
              _sum: { currentStock: true }
            })
          ]);

        return {
          branch,
          visits,
          syntheticVisits,
          salesCount: sales._count,
          salesCents: sales._sum.totalCents ?? 0,
          paidCents: payments._sum.amountCents ?? 0,
          paymentsCount: payments._count,
          purchasesCount: purchases._count,
          purchasesCents: purchases._sum.totalCents ?? 0,
          openCashSessions:
            cashSessions.find((session) => session.status === "open")?._count._all ?? 0,
          stockUnits: balances._sum.currentStock ?? 0
        };
      })
    );

    return {
      rows,
      consolidated: rows
        .filter((row) => row.branch.status === "active")
        .reduce(
          (total, row) => ({
            visits: total.visits + row.visits,
            salesCents: total.salesCents + row.salesCents,
            paidCents: total.paidCents + row.paidCents,
            purchasesCents: total.purchasesCents + row.purchasesCents,
            stockUnits: total.stockUnits + row.stockUnits
          }),
          { visits: 0, salesCents: 0, paidCents: 0, purchasesCents: 0, stockUnits: 0 }
        )
    };
  });
}
