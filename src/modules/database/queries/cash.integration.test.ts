import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import {
  approveCashSessionClose,
  createStaffCashExpense,
  findCashWorkflowError,
  getCashDashboard,
  openCashSession,
  requestCashSessionClose,
  reverseCashMovement
} from "@/modules/database/queries/cash";

async function cleanCash() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "CashExpenseBeneficiary", "CashExpense", "CashSessionReconciliation", "CashMovement", "CashSession" CASCADE'
  );
  await prisma.auditEvent.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

beforeEach(cleanCash);
afterEach(cleanCash);

async function createCashUsers() {
  const passwordHash = await hashPassword("clave-segura-caja-123");
  const admin = await prisma.internalUser.create({
    data: {
      email: "admin-caja@example.com",
      name: "Administración Caja",
      passwordHash,
      role: "administracion"
    }
  });
  const direction = await prisma.internalUser.create({
    data: {
      email: "direccion-caja@example.com",
      name: "Dirección Caja",
      passwordHash,
      role: "direccion"
    }
  });
  const nurse = await prisma.internalUser.create({
    data: {
      email: "enfermeria-caja@example.com",
      name: "Enfermería Caja",
      passwordHash,
      role: "enfermeria"
    }
  });
  return { admin, direction, nurse };
}

describe("cash integration", () => {
  it("records individual staff lines once and derives the daily close", async () => {
    const { admin, direction, nurse } = await createCashUsers();
    const session = await openCashSession({
      branchCode: "el-alto",
      registerName: "Caja principal",
      businessDate: new Date("2026-07-30T00:00:00.000Z"),
      shift: "full_day",
      responsibleId: admin.id,
      openedById: admin.id,
      openingCashCents: 10_000,
      idempotencyKey: "open-cash-once"
    });
    const input = {
      cashSessionId: session.id,
      category: "lunch" as const,
      beneficiaries: [
        { employeeId: admin.id, amountCents: 2_000 },
        { employeeId: nurse.id, amountCents: 3_000 }
      ],
      deliveredById: admin.id,
      registeredById: admin.id,
      authorizedById: direction.id,
      reason: "Almuerzo del personal",
      idempotencyKey: "staff-expense-once"
    };

    const first = await createStaffCashExpense(input);
    const retry = await createStaffCashExpense(input);
    expect(retry.id).toBe(first.id);
    expect(first.totalCents).toBe(5_000);
    expect(first.beneficiaries).toHaveLength(2);
    expect(await prisma.cashExpense.count()).toBe(1);
    expect(await prisma.cashMovement.count()).toBe(1);

    const close = await requestCashSessionClose({
      cashSessionId: session.id,
      requestedById: admin.id,
      reportedByChannel: {
        cash: 5_000,
        qr: 0,
        card: 0,
        transfer: 0,
        other: 0
      }
    });
    expect(close.requiresApproval).toBe(false);
    expect(close.session).toMatchObject({
      status: "closed",
      expectedCashCents: 5_000,
      differenceCents: 0
    });

    let failure: unknown;
    try {
      await createStaffCashExpense({
        ...input,
        idempotencyKey: "expense-after-close"
      });
    } catch (error) {
      failure = error;
    }
    expect(findCashWorkflowError(failure)?.code).toBe("session_not_open");
  });

  it("uses a compensating movement and sends a large difference to Direction", async () => {
    const { admin, direction, nurse } = await createCashUsers();
    const firstSession = await openCashSession({
      branchCode: "el-alto",
      registerName: "Caja principal",
      businessDate: new Date("2026-07-29T00:00:00.000Z"),
      shift: "full_day",
      responsibleId: admin.id,
      openedById: admin.id,
      openingCashCents: 10_000,
      idempotencyKey: "first-session"
    });
    const expense = await createStaffCashExpense({
      cashSessionId: firstSession.id,
      category: "transport",
      beneficiaries: [{ employeeId: nurse.id, amountCents: 5_000 }],
      deliveredById: admin.id,
      registeredById: admin.id,
      authorizedById: direction.id,
      reason: "Transporte extraordinario",
      idempotencyKey: "first-expense"
    });
    await requestCashSessionClose({
      cashSessionId: firstSession.id,
      requestedById: admin.id,
      reportedByChannel: {
        cash: 5_000,
        qr: 0,
        card: 0,
        transfer: 0,
        other: 0
      }
    });

    const secondSession = await openCashSession({
      branchCode: "el-alto",
      registerName: "Caja principal",
      businessDate: new Date("2026-07-30T00:00:00.000Z"),
      shift: "full_day",
      responsibleId: admin.id,
      openedById: admin.id,
      openingCashCents: 0,
      idempotencyKey: "second-session"
    });
    const correction = await reverseCashMovement({
      originalMovementId: expense.movement.id,
      amountCents: 5_000,
      actorId: direction.id,
      reason: "El empleado devolvió el dinero no utilizado",
      idempotencyKey: "expense-reversal"
    });
    expect(correction).toMatchObject({
      cashSessionId: secondSession.id,
      type: "reversal",
      originalMovementId: expense.movement.id
    });

    let repeatedCorrection: unknown;
    try {
      await reverseCashMovement({
        originalMovementId: expense.movement.id,
        amountCents: 1,
        actorId: direction.id,
        reason: "Intento duplicado",
        idempotencyKey: "second-reversal"
      });
    } catch (error) {
      repeatedCorrection = error;
    }
    expect(findCashWorkflowError(repeatedCorrection)?.code).toBe(
      "correction_exceeds_original"
    );

    const close = await requestCashSessionClose({
      cashSessionId: secondSession.id,
      requestedById: admin.id,
      reportedByChannel: {
        cash: 0,
        qr: 0,
        card: 0,
        transfer: 0,
        other: 0
      },
      observation: "El reintegro aún no está físicamente en la caja."
    });
    expect(close).toMatchObject({ requiresApproval: true });
    expect(close.session.status).toBe("pending_approval");

    const approved = await approveCashSessionClose({
      cashSessionId: secondSession.id,
      approvedById: direction.id,
      observation: "Diferencia revisada con Administración."
    });
    expect(approved).toMatchObject({
      status: "closed",
      approvedById: direction.id,
      closedById: direction.id
    });

    const dashboard = await getCashDashboard({ sessionId: secondSession.id });
    expect(dashboard.expected?.cash).toBe(5_000);
  });
});
