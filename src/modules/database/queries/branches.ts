import type { InternalRole, Prisma } from "@/generated/prisma/client";
import { canViewConsolidatedBranches, defaultBranchCode } from "@/features/branches/policy";
import { prisma, withDatabaseError } from "@/modules/database";

const branchSelect = {
  code: true,
  name: true,
  city: true,
  department: true,
  status: true
} satisfies Prisma.ClinicBranchSelect;

export async function getBranchesForUser(userId: string, role: InternalRole) {
  return withDatabaseError("getBranchesForUser", async () => {
    const assignments = await prisma.internalUserBranch.findMany({
      where: { userId },
      select: { isDefault: true, branch: { select: branchSelect } },
      orderBy: [{ isDefault: "desc" }, { branch: { name: "asc" } }]
    });

    const assigned = assignments.map((assignment) => ({
      ...assignment.branch,
      isDefault: assignment.isDefault,
      assigned: true
    }));

    if (!canViewConsolidatedBranches(role)) return assigned;

    const assignedCodes = assigned.map((branch) => branch.code);
    const otherBranches = await prisma.clinicBranch.findMany({
      where: { code: { notIn: assignedCodes } },
      select: branchSelect,
      orderBy: { name: "asc" }
    });

    return [
      ...assigned,
      ...otherBranches.map((branch) => ({ ...branch, isDefault: false, assigned: false }))
    ];
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

export async function ensureDefaultBranchAssignment(userId: string) {
  return withDatabaseError("ensureDefaultBranchAssignment", () =>
    prisma.internalUserBranch.upsert({
      where: { userId_branchCode: { userId, branchCode: defaultBranchCode } },
      create: { userId, branchCode: defaultBranchCode, isDefault: true },
      update: {}
    })
  );
}

export async function replaceUserBranchAssignments(input: {
  userId: string;
  branchCodes: string[];
  defaultBranchCode: string;
}) {
  return withDatabaseError("replaceUserBranchAssignments", () =>
    prisma.$transaction(async (tx) => {
      const branchCodes = [...new Set(input.branchCodes)];
      if (!branchCodes.includes(input.defaultBranchCode)) {
        throw new Error("DEFAULT_BRANCH_NOT_ASSIGNED");
      }
      const validBranches = await tx.clinicBranch.findMany({
        where: { code: { in: branchCodes }, status: { not: "inactive" } },
        select: { code: true, status: true }
      });
      const defaultBranch = validBranches.find(
        (branch) => branch.code === input.defaultBranchCode
      );
      if (
        validBranches.length !== branchCodes.length ||
        !defaultBranch ||
        defaultBranch.status !== "active"
      ) {
        throw new Error("INVALID_BRANCH_ASSIGNMENT");
      }

      await tx.internalUserBranch.deleteMany({ where: { userId: input.userId } });
      await tx.internalUserBranch.createMany({
        data: branchCodes.map((branchCode) => ({
          userId: input.userId,
          branchCode,
          isDefault: branchCode === input.defaultBranchCode
        }))
      });
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
