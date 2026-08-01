import { randomUUID } from "node:crypto";
import type {
  CashChannel,
  ClinicalAttachmentStorageDriver,
  InventoryLotAdjustmentKind,
  Prisma,
  PurchasePaymentMethod,
  PurchaseStatus
} from "@/generated/prisma/client";
import { applyInventoryMovement } from "@/modules/database/queries/inventory";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import { todayDatabaseDate, todayDateOnly } from "@/lib/dates";

export class PurchaseWorkflowError extends Error {
  constructor(
    public readonly code:
      | "invalid-lines"
      | "inactive-supplier"
      | "inactive-item"
      | "invalid-status"
      | "concurrent-update"
      | "cash-session-required"
      | "cash-session-not-open"
      | "payment-exceeds-balance"
      | "credit-is-not-payment"
      | "source-expense-invalid"
      | "source-expense-total-mismatch"
      | "receipt-exceeds-pending"
      | "receipt-empty"
      | "branch-mismatch"
      | "invalid-authorizer"
      | "insufficient-lot-stock"
  ) {
    super(code);
    this.name = "PurchaseWorkflowError";
  }
}

export function findPurchaseWorkflowError(error: unknown): PurchaseWorkflowError | null {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof PurchaseWorkflowError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

export type PurchaseDocumentMetadata = {
  storageKey: string;
  storageDriver: ClinicalAttachmentStorageDriver;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
};

export function effectivePurchasePaymentCents(payment: {
  amountCents: number;
  cashMovement?: {
    corrections: Array<{ amountCents: number }>;
  } | null;
}) {
  const corrected = payment.cashMovement?.corrections.reduce(
    (sum, correction) => sum + correction.amountCents,
    0
  ) ?? 0;
  return Math.max(0, payment.amountCents - corrected);
}

function generatedNumber(prefix: "OC" | "REC" | "LOT") {
  const date = todayDateOnly().replaceAll("-", "");
  return `${prefix}-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function lockPurchase(tx: Prisma.TransactionClient, purchaseId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Purchase" WHERE "id" = ${purchaseId} FOR UPDATE`;
  return tx.purchase.findUniqueOrThrow({
    where: { id: purchaseId },
    include: {
      lines: true,
      payments: {
        include: {
          cashMovement: {
            include: { corrections: { select: { amountCents: true } } }
          }
        }
      },
      receipts: { select: { id: true } },
      sourceCashExpense: { include: { movement: true } }
    }
  });
}

async function lockOpenCashSession(tx: Prisma.TransactionClient, cashSessionId?: string) {
  if (!cashSessionId) throw new PurchaseWorkflowError("cash-session-required");
  await tx.$queryRaw`SELECT "id" FROM "CashSession" WHERE "id" = ${cashSessionId} FOR UPDATE`;
  const session = await tx.cashSession.findUnique({ where: { id: cashSessionId } });
  if (!session || session.status !== "open") {
    throw new PurchaseWorkflowError("cash-session-not-open");
  }
  return session;
}

async function assertActiveUser(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.internalUser.findUnique({ where: { id: userId } });
  if (!user?.active) throw new PurchaseWorkflowError("invalid-authorizer");
  return user;
}

async function assertDirectionAuthorizer(tx: Prisma.TransactionClient, userId: string) {
  const user = await assertActiveUser(tx, userId);
  if (user.role !== "direccion" && user.role !== "super_admin") {
    throw new PurchaseWorkflowError("invalid-authorizer");
  }
  return user;
}

function methodToChannel(method: PurchasePaymentMethod): CashChannel {
  if (method === "cash" || method === "transfer") return method;
  return "other";
}

async function createPaidPurchasePayment(
  tx: Prisma.TransactionClient,
  input: {
    purchaseId: string;
    purchaseNumber: string;
    branchCode: string;
    cashSessionId: string;
    method: Exclude<PurchasePaymentMethod, "credit">;
    amountCents: number;
    reference?: string;
    recordedById: string;
    idempotencyKey: string;
    paidAt?: Date;
  }
) {
  const reused = await tx.purchasePayment.findUnique({
    where: { idempotencyKey: input.idempotencyKey }
  });
  if (reused) return reused;

  const session = await lockOpenCashSession(tx, input.cashSessionId);
  if (session.branchCode !== input.branchCode) {
    throw new PurchaseWorkflowError("cash-session-not-open");
  }
  const movement = await tx.cashMovement.create({
    data: {
      branchCode: input.branchCode,
      cashSessionId: input.cashSessionId,
      userId: input.recordedById,
      idempotencyKey: `purchase-payment:${input.idempotencyKey}`,
      type: "expense",
      channel: methodToChannel(input.method),
      amountCents: input.amountCents,
      description: `Pago compra ${input.purchaseNumber}`,
      reason: "Pago a proveedor",
      note: input.reference,
      occurredAt: input.paidAt
    }
  });

  return tx.purchasePayment.create({
    data: {
      purchaseId: input.purchaseId,
      branchCode: input.branchCode,
      cashSessionId: input.cashSessionId,
      cashMovementId: movement.id,
      recordedById: input.recordedById,
      method: input.method,
      amountCents: input.amountCents,
      reference: input.reference,
      idempotencyKey: input.idempotencyKey,
      paidAt: input.paidAt
    }
  });
}

export async function createPurchaseDraftRecord(input: {
  supplierId: string;
  sourceCashExpenseId?: string;
  branchCode: string;
  purchaseDate: Date;
  documentNumber?: string;
  currency: "BOB";
  intendedPaymentMethod: PurchasePaymentMethod;
  notes?: string;
  idempotencyKey: string;
  createdById: string;
  document?: PurchaseDocumentMetadata;
  lines: Array<{
    itemId: string;
    orderedQuantity: number;
    unitCostCents: number;
  }>;
}) {
  return withDatabaseError("createPurchaseDraftRecord", async () =>
    prisma.$transaction(async (tx) => {
      const reused = await tx.purchase.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });
      if (reused) return reused;

      const supplier = await tx.supplier.findUnique({ where: { id: input.supplierId } });
      if (!supplier?.active) throw new PurchaseWorkflowError("inactive-supplier");
      const validLines = input.lines.filter(
        (line) => line.itemId && line.orderedQuantity > 0 && line.unitCostCents > 0
      );
      if (validLines.length === 0 || validLines.length !== input.lines.length) {
        throw new PurchaseWorkflowError("invalid-lines");
      }
      const items = await tx.inventoryItem.findMany({
        where: { id: { in: [...new Set(validLines.map((line) => line.itemId))] } }
      });
      if (
        items.length !== new Set(validLines.map((line) => line.itemId)).size ||
        items.some((item) => !item.active)
      ) {
        throw new PurchaseWorkflowError("inactive-item");
      }
      const itemById = new Map(items.map((item) => [item.id, item]));
      const totalCents = validLines.reduce(
        (total, line) => total + line.orderedQuantity * line.unitCostCents,
        0
      );
      if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
        throw new PurchaseWorkflowError("invalid-lines");
      }

      if (input.sourceCashExpenseId) {
        const expense = await tx.cashExpense.findUnique({
          where: { id: input.sourceCashExpenseId },
          include: { purchase: true }
        });
        if (
          !expense ||
          expense.purchase ||
          expense.kind !== "urgent_purchase" ||
          !expense.requiresInventoryEntry
        ) {
          throw new PurchaseWorkflowError("source-expense-invalid");
        }
        if (expense.totalCents !== totalCents) {
          throw new PurchaseWorkflowError("source-expense-total-mismatch");
        }
      }

      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber: generatedNumber("OC"),
          supplierId: input.supplierId,
          sourceCashExpenseId: input.sourceCashExpenseId,
          createdById: input.createdById,
          branchCode: input.branchCode,
          purchaseDate: input.purchaseDate,
          documentNumber: input.documentNumber,
          currency: input.currency,
          intendedPaymentMethod: input.intendedPaymentMethod,
          totalCents,
          notes: input.notes,
          idempotencyKey: input.idempotencyKey,
          lines: {
            create: validLines.map((line) => {
              const item = itemById.get(line.itemId)!;
              return {
                itemId: line.itemId,
                description: item.name,
                unit: item.unit,
                orderedQuantity: line.orderedQuantity,
                unitCostCents: line.unitCostCents,
                subtotalCents: line.orderedQuantity * line.unitCostCents
              };
            })
          }
        }
      });

      if (input.document) {
        await tx.purchaseDocument.create({
          data: {
            purchaseId: purchase.id,
            uploadedById: input.createdById,
            kind: "purchase",
            storageKey: input.document.storageKey,
            storageDriver: input.document.storageDriver,
            originalName: input.document.originalName,
            mimeType: input.document.contentType,
            sizeBytes: input.document.sizeBytes,
            checksumSha256: input.document.checksumSha256
          }
        });
      }
      return purchase;
    })
  );
}

export async function confirmPurchaseRecord(input: {
  purchaseId: string;
  expectedRevision: number;
  confirmedById: string;
  cashSessionId?: string;
  paymentReference?: string;
  paymentIdempotencyKey: string;
}) {
  return withDatabaseError("confirmPurchaseRecord", async () =>
    prisma.$transaction(async (tx) => {
      const purchase = await lockPurchase(tx, input.purchaseId);
      if (purchase.status !== "draft") throw new PurchaseWorkflowError("invalid-status");
      if (purchase.revision !== input.expectedRevision) {
        throw new PurchaseWorkflowError("concurrent-update");
      }

      if (purchase.sourceCashExpense) {
        if (purchase.sourceCashExpense.totalCents !== purchase.totalCents) {
          throw new PurchaseWorkflowError("source-expense-total-mismatch");
        }
        await tx.purchasePayment.create({
          data: {
            purchaseId: purchase.id,
            cashSessionId: purchase.sourceCashExpense.cashSessionId,
            cashMovementId: purchase.sourceCashExpense.movementId,
            recordedById: input.confirmedById,
            method:
              purchase.sourceCashExpense.movement.channel === "transfer"
                ? "transfer"
                : purchase.sourceCashExpense.movement.channel === "cash"
                  ? "cash"
                  : "other",
            amountCents: purchase.totalCents,
            reference: `Compra urgente ${purchase.sourceCashExpense.id}`,
            idempotencyKey: `urgent-expense:${purchase.sourceCashExpense.id}`,
            paidAt: purchase.sourceCashExpense.occurredAt
          }
        });
      } else if (purchase.intendedPaymentMethod !== "credit") {
        await createPaidPurchasePayment(tx, {
          purchaseId: purchase.id,
          purchaseNumber: purchase.purchaseNumber,
          branchCode: purchase.branchCode,
          cashSessionId: input.cashSessionId ?? "",
          method: purchase.intendedPaymentMethod,
          amountCents: purchase.totalCents,
          reference: input.paymentReference,
          recordedById: input.confirmedById,
          idempotencyKey: input.paymentIdempotencyKey
        });
      }

      return tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: "confirmed",
          confirmedById: input.confirmedById,
          confirmedAt: new Date(),
          revision: { increment: 1 }
        }
      });
    })
  );
}

export async function recordPurchasePayment(input: {
  purchaseId: string;
  cashSessionId: string;
  method: Exclude<PurchasePaymentMethod, "credit">;
  amountCents: number;
  reference?: string;
  recordedById: string;
  idempotencyKey: string;
  paidAt?: Date;
}) {
  return withDatabaseError("recordPurchasePayment", async () =>
    prisma.$transaction(async (tx) => {
      const reused = await tx.purchasePayment.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });
      if (reused) return reused;
      const purchase = await lockPurchase(tx, input.purchaseId);
      if (purchase.status === "draft" || purchase.status === "cancelled") {
        throw new PurchaseWorkflowError("invalid-status");
      }
      const paid = purchase.payments.reduce(
        (sum, payment) => sum + effectivePurchasePaymentCents(payment),
        0
      );
      if (input.amountCents <= 0 || paid + input.amountCents > purchase.totalCents) {
        throw new PurchaseWorkflowError("payment-exceeds-balance");
      }
      return createPaidPurchasePayment(tx, {
        ...input,
        purchaseNumber: purchase.purchaseNumber,
        branchCode: purchase.branchCode
      });
    })
  );
}

export async function cancelPurchaseRecord(input: {
  purchaseId: string;
  expectedRevision: number;
  cancelledById: string;
  reason: string;
}) {
  return withDatabaseError("cancelPurchaseRecord", async () =>
    prisma.$transaction(async (tx) => {
      const purchase = await lockPurchase(tx, input.purchaseId);
      if (
        !["draft", "confirmed"].includes(purchase.status) ||
        purchase.payments.length > 0 ||
        purchase.receipts.length > 0
      ) {
        throw new PurchaseWorkflowError("invalid-status");
      }
      if (purchase.revision !== input.expectedRevision) {
        throw new PurchaseWorkflowError("concurrent-update");
      }
      return tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: "cancelled",
          cancelledById: input.cancelledById,
          cancelledAt: new Date(),
          notes: purchase.notes
            ? `${purchase.notes}\nAnulación: ${input.reason}`
            : `Anulación: ${input.reason}`,
          revision: { increment: 1 }
        }
      });
    })
  );
}

export async function createPurchaseReceiptRecord(input: {
  purchaseId: string;
  branchCode: string;
  locationCode: string;
  documentNumber?: string;
  receivedAt: Date;
  receivedById: string;
  recordedById: string;
  notes?: string;
  idempotencyKey: string;
  document?: PurchaseDocumentMetadata;
  lines: Array<{
    purchaseLineId: string;
    quantity: number;
    unitCostCents: number;
    batchNumber?: string;
    expirationDate?: Date;
  }>;
}) {
  return withDatabaseError("createPurchaseReceiptRecord", async () =>
    prisma.$transaction(async (tx) => {
      const reused = await tx.purchaseReceipt.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });
      if (reused) return reused;
      const purchase = await lockPurchase(tx, input.purchaseId);
      const reusedAfterLock = await tx.purchaseReceipt.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });
      if (reusedAfterLock) return reusedAfterLock;
      if (!["confirmed", "partially_received"].includes(purchase.status)) {
        throw new PurchaseWorkflowError("invalid-status");
      }
      if (purchase.branchCode !== input.branchCode) {
        throw new PurchaseWorkflowError("branch-mismatch");
      }
      await assertActiveUser(tx, input.receivedById);
      const validLines = input.lines.filter((line) => line.quantity > 0);
      if (validLines.length === 0) throw new PurchaseWorkflowError("receipt-empty");
      const purchaseLineById = new Map(purchase.lines.map((line) => [line.id, line]));
      for (const line of validLines) {
        const purchaseLine = purchaseLineById.get(line.purchaseLineId);
        if (
          !purchaseLine ||
          line.quantity > purchaseLine.orderedQuantity - purchaseLine.receivedQuantity ||
          line.unitCostCents <= 0
        ) {
          throw new PurchaseWorkflowError("receipt-exceeds-pending");
        }
      }

      const receipt = await tx.purchaseReceipt.create({
        data: {
          receiptNumber: generatedNumber("REC"),
          purchaseId: purchase.id,
          recordedById: input.recordedById,
          receivedById: input.receivedById,
          branchCode: input.branchCode,
          locationCode: input.locationCode,
          documentNumber: input.documentNumber,
          receivedAt: input.receivedAt,
          notes: input.notes,
          idempotencyKey: input.idempotencyKey
        }
      });

      for (const line of validLines) {
        const purchaseLine = purchaseLineById.get(line.purchaseLineId)!;
        const lot = await tx.inventoryLot.create({
          data: {
            internalLotCode: generatedNumber("LOT"),
            itemId: purchaseLine.itemId,
            supplierId: purchase.supplierId,
            purchaseId: purchase.id,
            purchaseLineId: purchaseLine.id,
            receiptId: receipt.id,
            batchNumber: line.batchNumber,
            expirationDate: line.expirationDate,
            branchCode: input.branchCode,
            locationCode: input.locationCode,
            receivedQuantity: line.quantity,
            currentQuantity: line.quantity,
            unitCostCents: line.unitCostCents
          }
        });
        const receiptLine = await tx.purchaseReceiptLine.create({
          data: {
            receiptId: receipt.id,
            purchaseLineId: purchaseLine.id,
            itemId: purchaseLine.itemId,
            lotId: lot.id,
            quantity: line.quantity,
            unitCostCents: line.unitCostCents,
            subtotalCents: line.quantity * line.unitCostCents
          }
        });
        await applyInventoryMovement(tx, {
          itemId: purchaseLine.itemId,
          userId: input.recordedById,
          purchaseId: purchase.id,
          purchaseLineId: purchaseLine.id,
          receiptId: receipt.id,
          receiptLineId: receiptLine.id,
          lotId: lot.id,
          branchCode: input.branchCode,
          locationCode: input.locationCode,
          type: "purchase_receipt",
          quantityDelta: line.quantity,
          reason: `Recepción ${receipt.receiptNumber} · ${lot.internalLotCode}`
        });
        await tx.purchaseLine.update({
          where: { id: purchaseLine.id },
          data: { receivedQuantity: { increment: line.quantity } }
        });
      }

      const updatedLines = await tx.purchaseLine.findMany({
        where: { purchaseId: purchase.id },
        select: { orderedQuantity: true, receivedQuantity: true }
      });
      const hasPending = updatedLines.some(
        (line) => line.receivedQuantity < line.orderedQuantity
      );
      await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: hasPending ? "partially_received" : "received",
          revision: { increment: 1 }
        }
      });
      if (input.document) {
        await tx.purchaseDocument.create({
          data: {
            purchaseId: purchase.id,
            receiptId: receipt.id,
            uploadedById: input.recordedById,
            kind: "receipt",
            storageKey: input.document.storageKey,
            storageDriver: input.document.storageDriver,
            originalName: input.document.originalName,
            mimeType: input.document.contentType,
            sizeBytes: input.document.sizeBytes,
            checksumSha256: input.document.checksumSha256
          }
        });
      }
      return receipt;
    })
  );
}

export async function createInventoryLotAdjustmentRecord(input: {
  lotId: string;
  kind: InventoryLotAdjustmentKind;
  quantity: number;
  restocked: boolean;
  reason: string;
  recordedById: string;
  authorizedById: string;
  idempotencyKey: string;
}) {
  return withDatabaseError("createInventoryLotAdjustmentRecord", async () =>
    prisma.$transaction(async (tx) => {
      const reused = await tx.inventoryLotAdjustment.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });
      if (reused) return reused;
      await assertDirectionAuthorizer(tx, input.authorizedById);
      await tx.$queryRaw`SELECT "id" FROM "InventoryLot" WHERE "id" = ${input.lotId} FOR UPDATE`;
      const reusedAfterLock = await tx.inventoryLotAdjustment.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });
      if (reusedAfterLock) return reusedAfterLock;
      const lot = await tx.inventoryLot.findUniqueOrThrow({ where: { id: input.lotId } });
      const restocked =
        input.kind === "patient_return" || input.kind === "correction"
          ? input.restocked
          : false;
      let stockDelta = -input.quantity;
      if (input.kind === "patient_return") stockDelta = restocked ? input.quantity : 0;
      if (input.kind === "correction") stockDelta = restocked ? input.quantity : -input.quantity;
      if (stockDelta < 0 && Math.abs(stockDelta) > lot.currentQuantity) {
        throw new PurchaseWorkflowError("insufficient-lot-stock");
      }
      const currentQuantity = lot.currentQuantity + stockDelta;
      await tx.inventoryLot.update({
        where: { id: lot.id },
        data: {
          currentQuantity,
          active: currentQuantity > 0
        }
      });
      const adjustment = await tx.inventoryLotAdjustment.create({
        data: {
          itemId: lot.itemId,
          lotId: lot.id,
          recordedById: input.recordedById,
          authorizedById: input.authorizedById,
          kind: input.kind,
          quantity: input.quantity,
          stockDelta,
          restocked,
          reason: input.reason,
          idempotencyKey: input.idempotencyKey
        }
      });
      if (stockDelta !== 0) {
        await applyInventoryMovement(tx, {
          itemId: lot.itemId,
          userId: input.recordedById,
          purchaseId: lot.purchaseId,
          purchaseLineId: lot.purchaseLineId,
          receiptId: lot.receiptId,
          lotId: lot.id,
          lotAdjustmentId: adjustment.id,
          branchCode: lot.branchCode,
          locationCode: lot.locationCode,
          type:
            input.kind === "supplier_return"
              ? "supplier_return"
              : input.kind === "patient_return"
                ? "patient_return"
                : "lot_adjustment",
          quantityDelta: stockDelta,
          reason: input.reason
        });
      }
      return adjustment;
    })
  );
}

function purchaseWhere(input: {
  search?: string;
  status?: PurchaseStatus | "all";
  supplierId?: string;
  branchCode?: string;
}): Prisma.PurchaseWhereInput {
  const search = input.search?.trim();
  return {
    branchCode: input.branchCode,
    status: input.status && input.status !== "all" ? input.status : undefined,
    supplierId: input.supplierId && input.supplierId !== "all" ? input.supplierId : undefined,
    OR: search
      ? [
          { purchaseNumber: { contains: search, mode: "insensitive" } },
          { documentNumber: { contains: search, mode: "insensitive" } },
          { supplier: { name: { contains: search, mode: "insensitive" } } }
        ]
      : undefined
  };
}

export async function getPurchases(
  input: PaginationInput & {
    search?: string;
    status?: PurchaseStatus | "all";
    supplierId?: string;
    branchCode?: string;
  } = {}
) {
  const pagination = getPagination(input);
  return withDatabaseError("getPurchases", () =>
    prisma.purchase.findMany({
      where: purchaseWhere(input),
      include: {
        branch: true,
        supplier: true,
        payments: {
          include: {
            cashMovement: {
              include: { corrections: { select: { amountCents: true } } }
            }
          }
        },
        lines: { select: { orderedQuantity: true, receivedQuantity: true } },
        _count: { select: { receipts: true } }
      },
      orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
      skip: pagination.skip,
      take: pagination.take
    })
  );
}

export async function countPurchases(input: {
  search?: string;
  status?: PurchaseStatus | "all";
  supplierId?: string;
  branchCode?: string;
} = {}) {
  return withDatabaseError("countPurchases", () =>
    prisma.purchase.count({ where: purchaseWhere(input) })
  );
}

export async function getPurchaseById(id: string, branchCode?: string) {
  return withDatabaseError("getPurchaseById", () =>
    prisma.purchase.findFirst({
      where: { id, branchCode },
      include: {
        branch: true,
        supplier: true,
        sourceCashExpense: { include: { movement: true } },
        createdBy: true,
        confirmedBy: true,
        cancelledBy: true,
        lines: {
          include: {
            item: true,
            receiptLines: {
              include: { receipt: true, lot: true },
              orderBy: { createdAt: "asc" }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        payments: {
          include: {
            recordedBy: true,
            cashSession: true,
            cashMovement: { include: { corrections: true } }
          },
          orderBy: { paidAt: "desc" }
        },
        receipts: {
          include: {
            recordedBy: true,
            receivedBy: true,
            lines: { include: { item: true, lot: true } },
            documents: true
          },
          orderBy: { receivedAt: "desc" }
        },
        documents: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } }
      }
    })
  );
}

export async function getPurchaseSummary(branchCode?: string) {
  return withDatabaseError("getPurchaseSummary", async () => {
    const today = todayDatabaseDate();
    const [drafts, pendingReceipts, pendingPayments, expiringLots] = await Promise.all([
      prisma.purchase.count({ where: { branchCode, status: "draft" } }),
      prisma.purchase.count({ where: { branchCode, status: { in: ["confirmed", "partially_received"] } } }),
      prisma.purchase.findMany({
        where: { branchCode, status: { notIn: ["draft", "cancelled"] } },
        select: {
          totalCents: true,
          payments: {
            select: {
              amountCents: true,
              cashMovement: {
                select: {
                  corrections: { select: { amountCents: true } }
                }
              }
            }
          }
        }
      }),
      prisma.inventoryLot.count({
        where: {
          branchCode,
          active: true,
          currentQuantity: { gt: 0 },
          expirationDate: {
            lte: new Date(today.getTime() + 60 * 86_400_000)
          }
        }
      })
    ]);
    return {
      drafts,
      pendingReceipts,
      pendingPaymentCents: pendingPayments.reduce(
        (sum, purchase) =>
          sum -
          purchase.payments.reduce(
            (paid, payment) => paid + effectivePurchasePaymentCents(payment),
            0
          ) +
          purchase.totalCents,
        0
      ),
      expiringLots
    };
  });
}

export async function getPendingUrgentPurchaseExpenses() {
  return withDatabaseError("getPendingUrgentPurchaseExpenses", () =>
    prisma.cashExpense.findMany({
      where: {
        kind: "urgent_purchase",
        requiresInventoryEntry: true,
        purchase: null
      },
      include: { movement: true },
      orderBy: { occurredAt: "desc" },
      take: 50
    })
  );
}

export async function getPurchaseFormItems() {
  return withDatabaseError("getPurchaseFormItems", () =>
    prisma.inventoryItem.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        internalCode: true,
        unit: true,
        referenceCostCents: true
      },
      orderBy: [{ name: "asc" }, { internalCode: "asc" }]
    })
  );
}

export async function getOpenPurchaseCashSessions(branchCode?: string) {
  return withDatabaseError("getOpenPurchaseCashSessions", () =>
    prisma.cashSession.findMany({
      where: { branchCode, status: "open" },
      select: {
        id: true,
        registerName: true,
        branchCode: true,
        businessDate: true
      },
      orderBy: { openedAt: "desc" }
    })
  );
}

export async function getInventoryLots(
  input: PaginationInput & {
    search?: string;
    status?: "available" | "expiring" | "expired" | "empty" | "all";
    itemId?: string;
    branchCode?: string;
  } = {}
) {
  const pagination = getPagination(input);
  const today = todayDatabaseDate();
  const threshold = new Date(today.getTime() + 60 * 86_400_000);
  const search = input.search?.trim();
  const statusWhere: Prisma.InventoryLotWhereInput =
    input.status === "expired"
      ? { currentQuantity: { gt: 0 }, expirationDate: { lt: today } }
      : input.status === "expiring"
        ? { currentQuantity: { gt: 0 }, expirationDate: { gte: today, lte: threshold } }
        : input.status === "empty"
          ? { currentQuantity: 0 }
          : input.status === "available"
            ? { currentQuantity: { gt: 0 }, OR: [{ expirationDate: null }, { expirationDate: { gt: threshold } }] }
            : {};
  return withDatabaseError("getInventoryLots", () =>
    prisma.inventoryLot.findMany({
      where: {
        ...statusWhere,
        branchCode: input.branchCode,
        itemId: input.itemId,
        AND: search
          ? {
              OR: [
                { internalLotCode: { contains: search, mode: "insensitive" } },
                { batchNumber: { contains: search, mode: "insensitive" } },
                { item: { name: { contains: search, mode: "insensitive" } } }
              ]
            }
          : undefined
      },
      include: {
        item: true,
        supplier: true,
        purchase: true,
        receipt: true,
        adjustments: {
          include: { recordedBy: true, authorizedBy: true },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [
        { expirationDate: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" }
      ],
      skip: pagination.skip,
      take: pagination.take
    })
  );
}

export async function getFefoInventoryLotIds(branchCode = "el-alto") {
  return withDatabaseError("getFefoInventoryLotIds", async () => {
    const today = todayDatabaseDate();
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT ON ("itemId") "id"
      FROM "InventoryLot"
      WHERE "active" = true
        AND "branchCode" = ${branchCode}
        AND "currentQuantity" > 0
        AND ("expirationDate" IS NULL OR "expirationDate" >= ${today})
      ORDER BY "itemId", "expirationDate" ASC NULLS LAST, "createdAt" ASC
    `;
    return new Set(rows.map((row) => row.id));
  });
}

export async function countInventoryLots(input: {
  search?: string;
  status?: "available" | "expiring" | "expired" | "empty" | "all";
  itemId?: string;
  branchCode?: string;
} = {}) {
  const today = todayDatabaseDate();
  const threshold = new Date(today.getTime() + 60 * 86_400_000);
  const search = input.search?.trim();
  const statusWhere: Prisma.InventoryLotWhereInput =
    input.status === "expired"
      ? { currentQuantity: { gt: 0 }, expirationDate: { lt: today } }
      : input.status === "expiring"
        ? { currentQuantity: { gt: 0 }, expirationDate: { gte: today, lte: threshold } }
        : input.status === "empty"
          ? { currentQuantity: 0 }
          : input.status === "available"
            ? {
                currentQuantity: { gt: 0 },
                OR: [
                  { expirationDate: null },
                  { expirationDate: { gt: threshold } }
                ]
              }
            : {};
  return withDatabaseError("countInventoryLots", () =>
    prisma.inventoryLot.count({
      where: {
        ...statusWhere,
        branchCode: input.branchCode,
        itemId: input.itemId,
        AND: search
          ? {
              OR: [
                { internalLotCode: { contains: search, mode: "insensitive" } },
                { batchNumber: { contains: search, mode: "insensitive" } },
                { item: { name: { contains: search, mode: "insensitive" } } }
              ]
            }
          : undefined
      }
    })
  );
}

export async function getPurchaseDocumentById(id: string) {
  return withDatabaseError("getPurchaseDocumentById", () =>
    prisma.purchaseDocument.findUnique({ where: { id } })
  );
}

export async function getPurchaseDocumentByStorageKey(storageKey: string) {
  return withDatabaseError("getPurchaseDocumentByStorageKey", () =>
    prisma.purchaseDocument.findUnique({ where: { storageKey } })
  );
}
