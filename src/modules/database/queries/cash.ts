import type {
  CashChannel,
  CashExpenseCategory,
  CashMovementType,
  Prisma
} from "@/generated/prisma/client";
import { getCashCloseApprovalThresholdCents } from "@/features/cash/policy";
import { todayDatabaseDate } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";

export type CashWorkflowErrorCode =
  | "session_already_open"
  | "session_not_open"
  | "session_stale_open"
  | "session_business_date_required"
  | "exceptional_reason_required"
  | "exceptional_requires_prior_close"
  | "session_not_pending_approval"
  | "invalid_authorizer"
  | "invalid_person"
  | "beneficiary_total_mismatch"
  | "purchase_total_mismatch"
  | "invalid_movement"
  | "correction_exceeds_original"
  | "invalid_amount";

export class CashWorkflowError extends Error {
  constructor(
    public readonly code: CashWorkflowErrorCode,
    public readonly detail?: string
  ) {
    super(code);
    this.name = "CashWorkflowError";
  }
}

export function findCashWorkflowError(error: unknown): CashWorkflowError | null {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof CashWorkflowError) return current;
    current = "cause" in current ? current.cause : undefined;
  }

  return null;
}

const cashSessionInclude = {
  branch: { select: { code: true, name: true } },
  responsible: { select: { id: true, name: true, email: true } },
  openedBy: { select: { id: true, name: true, email: true } },
  closeRequestedBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  closedBy: { select: { id: true, name: true, email: true } },
  reconciliations: { orderBy: { channel: "asc" as const } },
  movements: {
    include: {
      user: { select: { id: true, name: true, email: true } },
      authorizedBy: { select: { id: true, name: true, email: true } },
      expense: {
        include: {
          beneficiaries: {
            include: {
              employee: { select: { id: true, name: true, email: true } }
            }
          },
          registeredBy: { select: { id: true, name: true, email: true } },
          deliveredBy: { select: { id: true, name: true, email: true } },
          authorizedBy: { select: { id: true, name: true, email: true } },
          requestedBy: { select: { id: true, name: true, email: true } },
          receivedBy: { select: { id: true, name: true, email: true } }
        }
      },
      originalMovement: {
        select: { id: true, description: true, amountCents: true, type: true }
      },
      corrections: {
        select: { id: true, amountCents: true, type: true }
      }
    },
    orderBy: [{ occurredAt: "desc" as const }, { createdAt: "desc" as const }]
  }
} satisfies Prisma.CashSessionInclude;

type CashSessionForSummary = {
  openingCashCents: number;
  movements: Array<{
    channel: CashChannel;
    type: CashMovementType;
    amountCents: number;
  }>;
};

const activePaymentCashChannels = ["cash", "qr"] as const satisfies readonly CashChannel[];

export function calculateCashExpected(session: CashSessionForSummary) {
  const byChannel: Record<CashChannel, number> = {
    cash: session.openingCashCents,
    qr: 0,
    card: 0,
    transfer: 0,
    other: 0
  };

  for (const movement of session.movements) {
    const sign =
      movement.type === "expense" || movement.type === "refund" ? -1 : 1;
    byChannel[movement.channel] += sign * movement.amountCents;
  }

  return byChannel;
}

export function calculateCashBreakdown(session: CashSessionForSummary) {
  const breakdown = {
    openingCashCents: session.openingCashCents,
    cashIncomeCents: 0,
    qrIncomeCents: 0,
    cashExpenseCents: 0,
    cashRefundCents: 0,
    cashReversalCents: 0,
    qrRefundCents: 0
  };

  for (const movement of session.movements) {
    if (movement.channel === "cash" && movement.type === "income") {
      breakdown.cashIncomeCents += movement.amountCents;
    }
    if (movement.channel === "qr" && movement.type === "income") {
      breakdown.qrIncomeCents += movement.amountCents;
    }
    if (movement.channel === "cash" && movement.type === "expense") {
      breakdown.cashExpenseCents += movement.amountCents;
    }
    if (movement.channel === "cash" && movement.type === "refund") {
      breakdown.cashRefundCents += movement.amountCents;
    }
    if (movement.channel === "cash" && movement.type === "reversal") {
      breakdown.cashReversalCents += movement.amountCents;
    }
    if (movement.channel === "qr" && movement.type === "refund") {
      breakdown.qrRefundCents += movement.amountCents;
    }
  }

  return {
    ...breakdown,
    expectedCashCents:
      breakdown.openingCashCents +
      breakdown.cashIncomeCents -
      breakdown.cashExpenseCents -
      breakdown.cashRefundCents +
      breakdown.cashReversalCents,
    expectedQrCents: breakdown.qrIncomeCents - breakdown.qrRefundCents
  };
}

async function lockCashSession(
  tx: Prisma.TransactionClient,
  cashSessionId: string
) {
  await tx.$queryRaw`
    SELECT "id"
    FROM "CashSession"
    WHERE "id" = ${cashSessionId}
    FOR UPDATE
  `;

  const session = await tx.cashSession.findUnique({
    where: { id: cashSessionId },
    include: { movements: true }
  });

  if (!session || session.status !== "open") {
    throw new CashWorkflowError("session_not_open");
  }

  return session;
}

export async function getOpenCashSessionForOperation(
  tx: Prisma.TransactionClient,
  branchCode: string,
  businessDate: Date = todayDatabaseDate()
) {
  const sessions = await tx.$queryRaw<Array<{ id: string; businessDate: Date }>>`
    SELECT "id"
    FROM "CashSession"
    WHERE "status" = 'open' AND "branchCode" = ${branchCode}
    ORDER BY "openedAt" DESC
    LIMIT 2
    FOR UPDATE
  `;

  if (sessions.length !== 1) {
    throw new CashWorkflowError("session_not_open");
  }

  const session = await tx.cashSession.findUniqueOrThrow({
    where: { id: sessions[0].id }
  });
  if (session.businessDate.getTime() !== businessDate.getTime()) {
    throw new CashWorkflowError("session_stale_open");
  }

  return session;
}

async function assertActivePerson(
  tx: Prisma.TransactionClient,
  userId: string
) {
  const user = await tx.internalUser.findFirst({
    where: { id: userId, active: true },
    select: { id: true, role: true }
  });

  if (!user) throw new CashWorkflowError("invalid_person");
  return user;
}

async function assertAuthorizer(
  tx: Prisma.TransactionClient,
  userId: string
) {
  const user = await assertActivePerson(tx, userId);
  if (user.role !== "direccion" && user.role !== "super_admin") {
    throw new CashWorkflowError("invalid_authorizer");
  }
}

export async function getCashPersonnel(branchCode?: string) {
  return withDatabaseError("getCashPersonnel", async () =>
    prisma.internalUser.findMany({
      where: {
        active: true,
        role: { not: "captacion" },
        branchAssignments: branchCode ? { some: { branchCode } } : undefined
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    })
  );
}

export async function getCashAuthorizers() {
  return withDatabaseError("getCashAuthorizers", async () =>
    prisma.internalUser.findMany({
      where: {
        active: true,
        role: { in: ["direccion", "super_admin"] }
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    })
  );
}

/**
 * Estado minimo de la Caja para decidir si se puede cobrar ahora mismo y, si no,
 * que apertura corresponde. Lo usan las pantallas de cobro (pendiente y venta)
 * para ofrecer la apertura sin salir del cobro; el tablero completo sigue en
 * `getCashDashboard`.
 */
export async function getCashOpenState(branchCode: string) {
  return withDatabaseError("getCashOpenState", async () => {
    const today = todayDatabaseDate();
    const [activeSession, closedTodayCount] = await Promise.all([
      prisma.cashSession.findFirst({
        where: {
          branchCode,
          status: { in: ["open", "pending_approval"] }
        },
        select: {
          id: true,
          status: true,
          registerName: true,
          businessDate: true
        },
        orderBy: { openedAt: "desc" }
      }),
      prisma.cashSession.count({
        where: { branchCode, businessDate: today, status: "closed" }
      })
    ]);

    const staleOpenSession =
      activeSession &&
      activeSession.status === "open" &&
      activeSession.businessDate.getTime() !== today.getTime()
        ? activeSession
        : null;

    return {
      activeSession,
      staleOpenSession,
      /** Hay una Caja abierta con la fecha de hoy: los cobros pasan. */
      canOperate: Boolean(activeSession?.status === "open") && !staleOpenSession,
      /** Ya hubo un cierre hoy: la nueva apertura debe ser excepcional. */
      requiresExceptionalOpen: !activeSession && closedTodayCount > 0
    };
  });
}

export async function getCashDashboard(input?: {
  sessionId?: string;
  type?: CashMovementType;
  channel?: CashChannel;
  branchCode?: string;
}) {
  return withDatabaseError("getCashDashboard", async () => {
    const activeSession = await prisma.cashSession.findFirst({
      where: {
        branchCode: input?.branchCode,
        status: { in: ["open", "pending_approval"] }
      },
      select: { id: true, status: true },
      orderBy: { openedAt: "desc" }
    });
    const today = todayDatabaseDate();
    const staleOpenSession = await prisma.cashSession.findFirst({
      where: {
        branchCode: input?.branchCode,
        status: "open",
        businessDate: { not: today }
      },
      select: {
        id: true,
        registerName: true,
        businessDate: true,
        openedAt: true
      },
      orderBy: { openedAt: "desc" }
    });
    const closedTodaySessions = await prisma.cashSession.findMany({
      where: {
        branchCode: input?.branchCode,
        businessDate: today,
        status: "closed"
      },
      select: {
        id: true,
        registerName: true,
        closedAt: true,
        exceptional: true
      },
      orderBy: { closedAt: "desc" }
    });
    const selectedSession =
      input?.sessionId
        ? await prisma.cashSession.findFirst({
            where: { id: input.sessionId, branchCode: input.branchCode },
            include: cashSessionInclude
          })
        : await prisma.cashSession.findFirst({
            where: activeSession ? { id: activeSession.id } : { id: "__none__" },
            include: cashSessionInclude,
            orderBy: { openedAt: "desc" }
          });

    const sessions = await prisma.cashSession.findMany({
      where: { branchCode: input?.branchCode },
      select: {
        id: true,
        branchCode: true,
        registerName: true,
        businessDate: true,
        status: true,
        exceptional: true,
        exceptionalReason: true,
        openedAt: true,
        closedAt: true,
        responsible: { select: { name: true, email: true } }
      },
      orderBy: { openedAt: "desc" },
      take: 30
    });

    if (!selectedSession) {
      return {
        session: null,
        sessions,
        expected: null,
        breakdown: null,
        activeSessionId: activeSession?.id ?? null,
        activeSessionStatus: activeSession?.status ?? null,
        staleOpenSession,
        closedTodaySessions,
        dailySummary: null
      };
    }

    const filteredMovements = selectedSession.movements.filter(
      (movement) =>
        (!input?.type || movement.type === input.type) &&
        (!input?.channel || movement.channel === input.channel)
    );

    const businessDateSessions = await prisma.cashSession.findMany({
      where: {
        branchCode: selectedSession.branchCode,
        businessDate: selectedSession.businessDate
      },
      select: {
        exceptional: true,
        movements: {
          where: { type: "income" },
          select: { amountCents: true }
        }
      }
    });
    const dailySummary = businessDateSessions.reduce(
      (summary, cashSession) => {
        const income = cashSession.movements.reduce(
          (total, movement) => total + movement.amountCents,
          0
        );
        if (cashSession.exceptional) {
          summary.exceptionalCents += income;
          summary.exceptionalSessions += 1;
        } else {
          summary.regularCents += income;
          summary.regularSessions += 1;
        }
        summary.totalCents += income;
        return summary;
      },
      {
        regularCents: 0,
        exceptionalCents: 0,
        totalCents: 0,
        regularSessions: 0,
        exceptionalSessions: 0
      }
    );

    return {
      session: { ...selectedSession, movements: filteredMovements },
      sessions,
      expected: calculateCashExpected(selectedSession),
      breakdown: calculateCashBreakdown(selectedSession),
      activeSessionId: activeSession?.id ?? null,
      activeSessionStatus: activeSession?.status ?? null,
      staleOpenSession,
      closedTodaySessions,
      dailySummary
    };
  });
}

export async function getCashSessionCloseReport(cashSessionId: string, branchCode?: string) {
  return withDatabaseError("getCashSessionCloseReport", async () =>
    prisma.cashSession.findFirst({
      where: { id: cashSessionId, branchCode },
      include: cashSessionInclude
    })
  );
}

export async function getCashExpenseByIdempotencyKey(
  idempotencyKey: string
) {
  return withDatabaseError("getCashExpenseByIdempotencyKey", async () =>
    prisma.cashExpense.findUnique({ where: { idempotencyKey } })
  );
}

export async function getCashExpenseReceipt(expenseId: string) {
  return withDatabaseError("getCashExpenseReceipt", async () =>
    prisma.cashExpense.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        receiptStorageKey: true,
        receiptStorageDriver: true,
        receiptOriginalName: true,
        receiptMimeType: true,
        receiptSizeBytes: true,
        receiptChecksumSha256: true
      }
    })
  );
}

export async function openCashSession(input: {
  branchCode: string;
  registerName: string;
  businessDate: Date;
  shift: "morning" | "afternoon" | "full_day" | "other";
  responsibleId: string;
  openedById: string;
  openingCashCents: number;
  idempotencyKey: string;
  exceptional?: boolean;
  exceptionalReason?: string;
}) {
  return withDatabaseError("openCashSession", async () => {
    if (input.openingCashCents < 0) {
      throw new CashWorkflowError("invalid_amount");
    }

    const existing = await prisma.cashSession.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (existing) return existing;

    await assertActivePerson(prisma, input.responsibleId);
    const activeSession = await prisma.cashSession.findFirst({
      where: {
        branchCode: input.branchCode,
        status: { in: ["open", "pending_approval"] }
      },
      orderBy: { openedAt: "desc" }
    });
    if (activeSession) {
      throw new CashWorkflowError(
        activeSession.businessDate.getTime() !== input.businessDate.getTime()
          ? "session_stale_open"
          : "session_already_open"
      );
    }

    const previousTodayClose = await prisma.cashSession.findFirst({
      where: {
        branchCode: input.branchCode,
        businessDate: input.businessDate,
        status: "closed"
      },
      orderBy: { closedAt: "desc" }
    });
    if (input.exceptional) {
      if (!input.exceptionalReason?.trim()) {
        throw new CashWorkflowError("exceptional_reason_required");
      }
      if (!previousTodayClose) {
        throw new CashWorkflowError("exceptional_requires_prior_close");
      }
    } else if (previousTodayClose) {
      throw new CashWorkflowError("session_business_date_required");
    }

    try {
      return await prisma.cashSession.create({
        data: {
          branchCode: input.branchCode,
          registerName: input.registerName,
          businessDate: input.businessDate,
          shift: input.shift,
          responsibleId: input.responsibleId,
          openedById: input.openedById,
          exceptional: input.exceptional ?? false,
          exceptionalReason: input.exceptional
            ? input.exceptionalReason?.trim()
            : undefined,
          openingCashCents: input.openingCashCents,
          idempotencyKey: input.idempotencyKey
        }
      });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new CashWorkflowError("session_already_open");
      }
      throw error;
    }
  });
}

export async function createStaffCashExpense(input: {
  cashSessionId: string;
  category: "lunch" | "transport" | "staff_other";
  beneficiaries: Array<{
    employeeId: string;
    amountCents: number;
    note?: string;
  }>;
  receivedById: string;
  deliveredById: string;
  registeredById: string;
  authorizedById: string;
  note?: string;
  idempotencyKey: string;
}) {
  return withDatabaseError("createStaffCashExpense", async () =>
    prisma.$transaction(async (tx) => {
      const reused = await tx.cashExpense.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { movement: true, beneficiaries: true }
      });
      if (reused) return reused;

      const session = await lockCashSession(tx, input.cashSessionId);
      const reusedAfterLock = await tx.cashExpense.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { movement: true, beneficiaries: true }
      });
      if (reusedAfterLock) return reusedAfterLock;
      await Promise.all([
        assertActivePerson(tx, input.receivedById),
        assertActivePerson(tx, input.deliveredById),
        assertAuthorizer(tx, input.authorizedById),
        ...input.beneficiaries.map((line) =>
          assertActivePerson(tx, line.employeeId)
        )
      ]);

      const validLines = input.beneficiaries;
      const uniqueEmployees = new Set(
        validLines.map((line) => line.employeeId)
      );
      const totalCents = validLines.reduce(
        (total, line) => total + line.amountCents,
        0
      );
      if (
        validLines.length === 0 ||
        uniqueEmployees.size !== validLines.length ||
        validLines.some(
          (line) =>
            !Number.isSafeInteger(line.amountCents) ||
            line.amountCents <= 0
        ) ||
        !Number.isSafeInteger(totalCents) ||
        totalCents <= 0
      ) {
        throw new CashWorkflowError("beneficiary_total_mismatch");
      }
      const reason =
        input.category === "lunch"
          ? "Almuerzo"
          : input.category === "transport"
            ? "Transporte"
            : "Otro apoyo al personal";

      const movement = await tx.cashMovement.create({
        data: {
          branchCode: session.branchCode,
          cashSessionId: input.cashSessionId,
          userId: input.registeredById,
          authorizedById: input.authorizedById,
          idempotencyKey: `expense:${input.idempotencyKey}`,
          type: "expense",
          channel: "cash",
          amountCents: totalCents,
          description: "Dinero entregado al personal",
          reason,
          note: input.note
        }
      });

      return tx.cashExpense.create({
        data: {
          cashSessionId: input.cashSessionId,
          movementId: movement.id,
          registeredById: input.registeredById,
          deliveredById: input.deliveredById,
          authorizedById: input.authorizedById,
          receivedById: input.receivedById,
          idempotencyKey: input.idempotencyKey,
          kind: "staff_support",
          category: input.category,
          totalCents,
          reason,
          note: input.note,
          beneficiaries: {
            create: validLines.map((line) => ({
              employeeId: line.employeeId,
              amountCents: line.amountCents,
              note: line.note
            }))
          }
        },
        include: { movement: true, beneficiaries: true }
      });
    })
  );
}

type ReceiptMetadata = {
  storageKey: string;
  storageDriver: "local" | "vercel_blob";
  originalName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  uploadedAt: Date;
};

export async function createUrgentPurchaseExpense(input: {
  cashSessionId: string;
  category: Exclude<
    CashExpenseCategory,
    "lunch" | "transport" | "staff_other"
  >;
  itemDescription: string;
  deliveredAmountCents: number;
  returnedChangeCents: number;
  requestedById: string;
  receivedById: string;
  deliveredById: string;
  registeredById: string;
  authorizedById: string;
  urgencyReason: string;
  note?: string;
  /**
   * El gasto urgente alimenta el stock: habilita enlazarlo después a una orden
   * de compra. El commit `fa15696` (2026-08-14) lo quitó de la entrada y lo dejó
   * fijo en `false` al simplificar los diálogos de egreso, con lo que
   * `createPurchaseDraftRecord` pasó a rechazar todo enlace con
   * `source-expense-invalid`. Vuelve como opcional para que el contrato sea
   * satisfacible; los diálogos actuales no lo envían y conservan su valor falso.
   */
  requiresInventoryEntry?: boolean;
  idempotencyKey: string;
  receipt?: ReceiptMetadata;
}) {
  return withDatabaseError("createUrgentPurchaseExpense", async () =>
    prisma.$transaction(async (tx) => {
      const reused = await tx.cashExpense.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { movement: true }
      });
      if (reused) return reused;

      const session = await lockCashSession(tx, input.cashSessionId);
      const reusedAfterLock = await tx.cashExpense.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { movement: true }
      });
      if (reusedAfterLock) return reusedAfterLock;
      await Promise.all([
        assertActivePerson(tx, input.requestedById),
        assertActivePerson(tx, input.receivedById),
        assertActivePerson(tx, input.deliveredById),
        assertAuthorizer(tx, input.authorizedById)
      ]);

      const totalCents =
        input.deliveredAmountCents - input.returnedChangeCents;
      if (
        !Number.isSafeInteger(totalCents) ||
        input.deliveredAmountCents <= 0 ||
        input.returnedChangeCents < 0 ||
        input.returnedChangeCents >= input.deliveredAmountCents ||
        totalCents <= 0
      ) {
        throw new CashWorkflowError("purchase_total_mismatch");
      }
      const auditNote = [
        `Entregado: Bs ${(input.deliveredAmountCents / 100).toFixed(2)}`,
        `Cambio: Bs ${(input.returnedChangeCents / 100).toFixed(2)}`,
        input.note
      ].filter(Boolean).join("\n");

      const movement = await tx.cashMovement.create({
        data: {
          branchCode: session.branchCode,
          cashSessionId: input.cashSessionId,
          userId: input.registeredById,
          authorizedById: input.authorizedById,
          idempotencyKey: `expense:${input.idempotencyKey}`,
          type: "expense",
          channel: "cash",
          amountCents: totalCents,
          description: `Compra urgente: ${input.itemDescription}`,
          reason: input.urgencyReason,
          note: auditNote
        }
      });

      return tx.cashExpense.create({
        data: {
          cashSessionId: input.cashSessionId,
          movementId: movement.id,
          registeredById: input.registeredById,
          deliveredById: input.deliveredById,
          authorizedById: input.authorizedById,
          requestedById: input.requestedById,
          receivedById: input.receivedById,
          idempotencyKey: input.idempotencyKey,
          kind: "urgent_purchase",
          category: input.category,
          totalCents,
          reason: input.urgencyReason,
          note: auditNote,
          itemDescription: input.itemDescription,
          quantity: null,
          unitPriceCents: null,
          supplierName: null,
          urgencyReason: input.urgencyReason,
          requiresInventoryEntry: input.requiresInventoryEntry ?? false,
          receiptStorageKey: input.receipt?.storageKey,
          receiptStorageDriver: input.receipt?.storageDriver,
          receiptOriginalName: input.receipt?.originalName,
          receiptMimeType: input.receipt?.contentType,
          receiptSizeBytes: input.receipt?.sizeBytes,
          receiptChecksumSha256: input.receipt?.checksumSha256,
          receiptUploadedAt: input.receipt?.uploadedAt
        },
        include: { movement: true }
      });
    })
  );
}

export async function createOtherCashExpense(input: {
  cashSessionId: string;
  amountCents: number;
  receivedById: string;
  deliveredById: string;
  registeredById: string;
  authorizedById: string;
  reason: string;
  note?: string;
  idempotencyKey: string;
}) {
  return withDatabaseError("createOtherCashExpense", async () =>
    prisma.$transaction(async (tx) => {
      const reused = await tx.cashExpense.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { movement: true }
      });
      if (reused) return reused;

      if (input.amountCents <= 0) {
        throw new CashWorkflowError("invalid_amount");
      }
      const session = await lockCashSession(tx, input.cashSessionId);
      const reusedAfterLock = await tx.cashExpense.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { movement: true }
      });
      if (reusedAfterLock) return reusedAfterLock;
      await Promise.all([
        assertActivePerson(tx, input.receivedById),
        assertActivePerson(tx, input.deliveredById),
        assertAuthorizer(tx, input.authorizedById)
      ]);

      const movement = await tx.cashMovement.create({
        data: {
          branchCode: session.branchCode,
          cashSessionId: input.cashSessionId,
          userId: input.registeredById,
          authorizedById: input.authorizedById,
          idempotencyKey: `expense:${input.idempotencyKey}`,
          type: "expense",
          channel: "cash",
          amountCents: input.amountCents,
          description: "Otro egreso de Caja",
          reason: input.reason,
          note: input.note
        }
      });

      return tx.cashExpense.create({
        data: {
          cashSessionId: input.cashSessionId,
          movementId: movement.id,
          registeredById: input.registeredById,
          deliveredById: input.deliveredById,
          authorizedById: input.authorizedById,
          receivedById: input.receivedById,
          idempotencyKey: input.idempotencyKey,
          kind: "other",
          category: "other",
          totalCents: input.amountCents,
          reason: input.reason,
          note: input.note
        },
        include: { movement: true }
      });
    })
  );
}

export async function requestCashSessionClose(input: {
  cashSessionId: string;
  requestedById: string;
  reportedByChannel: Record<(typeof activePaymentCashChannels)[number], number>;
  observation?: string;
}) {
  return withDatabaseError("requestCashSessionClose", async () =>
    prisma.$transaction(async (tx) => {
      const session = await lockCashSession(tx, input.cashSessionId);
      const expected = calculateCashExpected(session);
      const reconciliations = activePaymentCashChannels.map((channel) => {
        const reportedCents = input.reportedByChannel[channel];
        if (
          !Number.isSafeInteger(reportedCents) ||
          reportedCents < 0
        ) {
          throw new CashWorkflowError("invalid_amount");
        }
        return {
          channel,
          expectedCents: expected[channel],
          reportedCents,
          differenceCents: reportedCents - expected[channel]
        };
      });
      const threshold = getCashCloseApprovalThresholdCents();
      const requiresApproval = reconciliations.some(
        (item) => Math.abs(item.differenceCents) > threshold
      );
      const now = new Date();

      await tx.cashSessionReconciliation.createMany({
        data: reconciliations.map((item) => ({
          cashSessionId: session.id,
          ...item
        }))
      });

      const updated = await tx.cashSession.update({
        where: { id: session.id },
        data: {
          expectedCashCents: expected.cash,
          countedCashCents: input.reportedByChannel.cash,
          differenceCents:
            input.reportedByChannel.cash - expected.cash,
          closeObservation: input.observation,
          closeRequestedById: input.requestedById,
          closeRequestedAt: now,
          status: requiresApproval ? "pending_approval" : "closed",
          closedById: requiresApproval ? null : input.requestedById,
          closedAt: requiresApproval ? null : now
        }
      });

      return { session: updated, reconciliations, requiresApproval };
    })
  );
}

export async function approveCashSessionClose(input: {
  cashSessionId: string;
  approvedById: string;
  observation: string;
}) {
  return withDatabaseError("approveCashSessionClose", async () =>
    prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "CashSession"
        WHERE "id" = ${input.cashSessionId}
        FOR UPDATE
      `;
      const session = await tx.cashSession.findUnique({
        where: { id: input.cashSessionId }
      });
      if (!session || session.status !== "pending_approval") {
        throw new CashWorkflowError("session_not_pending_approval");
      }
      await assertAuthorizer(tx, input.approvedById);
      const now = new Date();
      return tx.cashSession.update({
        where: { id: session.id },
        data: {
          status: "closed",
          approvedById: input.approvedById,
          approvedAt: now,
          closedById: input.approvedById,
          closedAt: now,
          closeObservation: session.closeObservation
            ? `${session.closeObservation}\nAprobación: ${input.observation}`
            : `Aprobación: ${input.observation}`
        }
      });
    })
  );
}

export async function reverseCashMovement(input: {
  originalMovementId: string;
  amountCents: number;
  actorId: string;
  reason: string;
  note?: string;
  idempotencyKey: string;
}) {
  return withDatabaseError("reverseCashMovement", async () =>
    prisma.$transaction(async (tx) => {
      const reused = await tx.cashMovement.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });
      if (reused) return reused;

      await assertAuthorizer(tx, input.actorId);
      const reusedAfterLock = await tx.cashMovement.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });
      if (reusedAfterLock) return reusedAfterLock;
      const original = await tx.cashMovement.findUnique({
        where: { id: input.originalMovementId },
        include: { corrections: true, sale: true }
      });
      if (
        !original ||
        (original.type !== "income" && original.type !== "expense")
      ) {
        throw new CashWorkflowError("invalid_movement");
      }
      const currentSession = await getOpenCashSessionForOperation(tx, original.branchCode);
      const correctedCents = original.corrections.reduce(
        (total, correction) => total + correction.amountCents,
        0
      );
      const remainingCents = original.amountCents - correctedCents;
      if (
        input.amountCents <= 0 ||
        input.amountCents > remainingCents ||
        (original.type === "expense" &&
          correctedCents + input.amountCents >= original.amountCents)
      ) {
        throw new CashWorkflowError("correction_exceeds_original");
      }

      const correction = await tx.cashMovement.create({
        data: {
          branchCode: original.branchCode,
          cashSessionId: currentSession.id,
          saleId: original.saleId,
          patientId: original.patientId,
          visitId: original.visitId,
          userId: input.actorId,
          authorizedById: input.actorId,
          originalMovementId: original.id,
          idempotencyKey: input.idempotencyKey,
          type: original.type === "income" ? "refund" : "reversal",
          channel: original.channel,
          amountCents: input.amountCents,
          description:
            original.type === "income"
              ? `Devolución de: ${original.description}`
              : `Cambio devuelto de: ${original.description}`,
          reason: input.reason,
          note: input.note
        }
      });

      if (original.type === "income" && original.sale) {
        const paidCents = Math.max(
          0,
          original.sale.paidCents - input.amountCents
        );
        const balanceCents = Math.max(
          0,
          original.sale.totalCents - paidCents
        );
        await tx.sale.update({
          where: { id: original.sale.id },
          data: {
            paidCents,
            balanceCents,
            status:
              paidCents <= 0
                ? "pending"
                : paidCents < original.sale.totalCents
                  ? "partial"
                  : "paid"
          }
        });
      }

      return correction;
    })
  );
}
