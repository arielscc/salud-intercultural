import type { CashChannel, Prisma, SaleItemType } from "@/generated/prisma/client";
import { dayRange, monthRange } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import { applyInventoryMovement } from "@/modules/database/queries/inventory";
import {
  CashWorkflowError,
  getOpenCashSessionForOperation
} from "@/modules/database/queries/cash";

const paymentMethodNames: Record<string, string> = {
  cash: "Efectivo",
  qr: "QR",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro"
};

function getSaleStatus(totalCents: number, paidCents: number) {
  if (paidCents <= 0) return "pending";
  if (paidCents < totalCents) return "partial";
  return "paid";
}

// Al quedar saldada una venta de la visita se activan los seguimientos que el
// médico dejó en espera de pago: pasan a `pending` y recién ahí los ve Recepción.
async function activateAwaitingPaymentFollowUps(
  tx: Prisma.TransactionClient,
  visitId: string | null | undefined
) {
  if (!visitId) return;
  const pending = await tx.followUpTask.findMany({
    where: { visitId, status: "awaiting_payment" },
    select: { id: true }
  });
  if (pending.length === 0) return;
  await tx.followUpTask.updateMany({
    where: { visitId, status: "awaiting_payment" },
    data: { status: "pending" }
  });
  await tx.followUpStatusHistory.createMany({
    data: pending.map((task) => ({
      taskId: task.id,
      toStatus: "pending" as const,
      note: "Activado al pagar el tratamiento."
    }))
  });
}

async function ensurePaymentMethod(tx: Prisma.TransactionClient, code: string) {
  return tx.paymentMethod.upsert({
    where: { code },
    create: {
      code,
      name: paymentMethodNames[code] ?? paymentMethodNames.other
    },
    update: {
      active: true
    }
  });
}

function paymentCodeToCashChannel(code: string): CashChannel {
  return code === "qr" ? "qr" : "cash";
}

export async function getAdministrationWorkItems(
  input: PaginationInput & { branchCode?: string } = {}
) {
  const pagination = getPagination(input);

  return withDatabaseError("getAdministrationWorkItems", async () => {
    return prisma.visitWorkItem.findMany({
      where: {
        visit: { branchCode: input.branchCode },
        area: "administracion",
        status: {
          in: ["pending", "acknowledged", "in_progress", "blocked"]
        }
      },
      include: {
        createdBy: true,
        clinicalOrders: {
          include: { doctor: true, treatmentProposalOutcome: true },
          orderBy: { createdAt: "desc" }
        },
        visit: {
          include: {
            patient: true,
            route: true,
            doctorOrder: { select: { status: true } }
          }
        },
        sales: {
          include: {
            items: true,
            payments: true
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      skip: pagination.skip,
      take: pagination.take
    });
  });
}

export async function getLatestPendingAdministrationWorkItem(branchCode?: string) {
  return withDatabaseError("getLatestPendingAdministrationWorkItem", async () => {
    return prisma.visitWorkItem.findFirst({
      where: {
        visit: { branchCode },
        area: "administracion",
        status: { in: ["pending", "acknowledged", "in_progress", "blocked"] },
        OR: [{ sales: { none: {} } }, { sales: { some: { balanceCents: { gt: 0 } } } }]
      },
      include: {
        createdBy: true,
        clinicalOrders: {
          include: { doctor: true, treatmentProposalOutcome: true },
          orderBy: { createdAt: "desc" }
        },
        visit: { include: { patient: true, route: true } },
        sales: {
          include: { items: true, payments: true },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  });
}

export async function getAdministrationWorkItemById(id: string) {
  return withDatabaseError("getAdministrationWorkItemById", async () => {
    return prisma.visitWorkItem.findUnique({
      where: { id },
      include: {
        createdBy: true,
        clinicalOrders: {
          include: { doctor: true, treatmentProposalOutcome: true },
          orderBy: { createdAt: "desc" }
        },
        visit: {
          include: {
            patient: true,
            route: true,
            doctorOrder: {
              include: {
                doctor: { select: { id: true, name: true, email: true } },
                lines: { orderBy: { position: "asc" } }
              }
            }
          }
        },
        sales: {
          include: {
            items: true,
            payments: {
              include: { method: true },
              orderBy: { paidAt: "desc" }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });
  });
}

export async function createSaleRecord(input: {
  idempotencyKey?: string;
  patientId: string;
  visitId?: string;
  workItemId?: string;
  createdById?: string;
  branchCode?: string;
  itemType: SaleItemType;
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountCents?: number;
  initialPaymentCents?: number;
  paymentMethodCode?: string;
  paymentReference?: string;
  notes?: string;
}) {
  return withDatabaseError("createSaleRecord", async () => {
    return prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const reused = await tx.sale.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { items: true }
        });
        if (reused) return reused;
      }

      const subtotalCents = input.quantity * input.unitPriceCents;
      const discountCents = Math.min(input.discountCents ?? 0, subtotalCents);
      const totalCents = Math.max(0, subtotalCents - discountCents);
      const initialPaymentCents = Math.min(input.initialPaymentCents ?? 0, totalCents);
      const status = getSaleStatus(totalCents, initialPaymentCents);
      const visitBranch = input.visitId
        ? await tx.visit.findUnique({
            where: { id: input.visitId },
            select: { branchCode: true }
          })
        : null;
      const branchCode = visitBranch?.branchCode ?? input.branchCode ?? "el-alto";
      if (visitBranch && input.branchCode && visitBranch.branchCode !== input.branchCode) {
        throw new Error("BRANCH_MISMATCH");
      }
      const cashSession =
        initialPaymentCents > 0
          ? await getOpenCashSessionForOperation(tx, branchCode)
          : null;

      const sale = await tx.sale.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          patientId: input.patientId,
          visitId: input.visitId,
          workItemId: input.workItemId,
          createdById: input.createdById,
          branchCode,
          status,
          subtotalCents,
          discountCents,
          totalCents,
          paidCents: initialPaymentCents,
          balanceCents: totalCents - initialPaymentCents,
          notes: input.notes,
          items: {
            create: {
              inventoryItemId: input.inventoryItemId,
              type: input.itemType,
              description: input.description,
              quantity: input.quantity,
              unitPriceCents: input.unitPriceCents,
              totalCents: subtotalCents
            }
          }
        },
        include: { items: true }
      });

      if (input.inventoryItemId) {
        await applyInventoryMovement(tx, {
          itemId: input.inventoryItemId,
          saleId: sale.id,
          saleItemId: sale.items[0]?.id,
          userId: input.createdById,
          branchCode,
          type: "automatic_sale_exit",
          quantityDelta: -input.quantity,
          reason: `Salida automática por venta ${sale.id}`
        });

        await tx.deliveredProduct.create({
          data: {
            saleId: sale.id,
            saleItemId: sale.items[0]?.id,
            patientId: input.patientId,
            visitId: input.visitId,
            description: input.description,
            quantity: input.quantity
          }
        });
      }

      if (initialPaymentCents > 0) {
        const method = await ensurePaymentMethod(tx, input.paymentMethodCode ?? "cash");
        const payment = await tx.payment.create({
          data: {
            idempotencyKey: input.idempotencyKey
              ? `sale:${input.idempotencyKey}`
              : undefined,
            saleId: sale.id,
            patientId: input.patientId,
            visitId: input.visitId,
            methodId: method.id,
            receivedById: input.createdById,
            branchCode,
            amountCents: initialPaymentCents,
            reference: input.paymentReference
          }
        });

        await tx.cashMovement.create({
          data: {
            idempotencyKey: input.idempotencyKey
              ? `sale:${input.idempotencyKey}`
              : undefined,
            cashSessionId: cashSession?.id,
            saleId: sale.id,
            paymentId: payment.id,
            patientId: input.patientId,
            visitId: input.visitId,
            userId: input.createdById,
            branchCode,
            type: "income",
            channel: paymentCodeToCashChannel(
              input.paymentMethodCode ?? "cash"
            ),
            amountCents: initialPaymentCents,
            description: `Cobro de venta ${sale.id}`
          }
        });
      }

      if (status === "paid") {
        await activateAwaitingPaymentFollowUps(tx, input.visitId);
      }

      if (input.workItemId && status === "paid") {
        await tx.visitWorkItem.update({
          where: { id: input.workItemId },
          data: {
            status: "completed",
            completedAt: new Date()
          }
        });
      }

      return sale;
    });
  });
}

export async function createSaleOrderRecord(input: {
  idempotencyKey?: string;
  patientId: string;
  visitId?: string;
  workItemId?: string;
  createdById?: string;
  branchCode?: string;
  subtotalCents: number;
  discountCents?: number;
  notes?: string;
  lines: Array<{
    itemType: SaleItemType;
    inventoryItemId?: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
  }>;
}) {
  return withDatabaseError("createSaleOrderRecord", async () => {
    return prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const reused = await tx.sale.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { items: true }
        });
        if (reused) return reused;
      }

      if (input.lines.length === 0) throw new Error("EMPTY_SALE_LINES");

      const visitBranch = input.visitId
        ? await tx.visit.findUnique({
            where: { id: input.visitId },
            select: { branchCode: true }
          })
        : null;
      const branchCode = visitBranch?.branchCode ?? input.branchCode ?? "el-alto";
      if (visitBranch && input.branchCode && visitBranch.branchCode !== input.branchCode) {
        throw new Error("BRANCH_MISMATCH");
      }

      const lineSumCents = input.lines.reduce(
        (sum, line) => sum + line.unitPriceCents * line.quantity,
        0
      );
      const subtotalCents = Math.max(0, input.subtotalCents || lineSumCents);
      const discountCents = Math.min(input.discountCents ?? 0, subtotalCents);
      const totalCents = Math.max(0, subtotalCents - discountCents);

      const sale = await tx.sale.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          patientId: input.patientId,
          visitId: input.visitId,
          workItemId: input.workItemId,
          createdById: input.createdById,
          branchCode,
          status: getSaleStatus(totalCents, 0),
          subtotalCents,
          discountCents,
          totalCents,
          paidCents: 0,
          balanceCents: totalCents,
          notes: input.notes,
          items: {
            create: input.lines.map((line) => ({
              inventoryItemId: line.inventoryItemId,
              type: line.itemType,
              description: line.description,
              quantity: line.quantity,
              unitPriceCents: line.unitPriceCents,
              totalCents: line.unitPriceCents * line.quantity
            }))
          }
        },
        include: { items: true }
      });

      for (const line of input.lines) {
        if (!line.inventoryItemId) continue;
        const saleItem = sale.items.find(
          (candidate) => candidate.inventoryItemId === line.inventoryItemId
        );
        await applyInventoryMovement(tx, {
          itemId: line.inventoryItemId,
          saleId: sale.id,
          saleItemId: saleItem?.id,
          userId: input.createdById,
          branchCode,
          type: "automatic_sale_exit",
          quantityDelta: -line.quantity,
          reason: `Salida automática por venta ${sale.id}`
        });
        await tx.deliveredProduct.create({
          data: {
            saleId: sale.id,
            saleItemId: saleItem?.id,
            patientId: input.patientId,
            visitId: input.visitId,
            description: line.description,
            quantity: line.quantity
          }
        });
      }

      return sale;
    });
  });
}

export class DoctorOrderSaleError extends Error {
  constructor(public readonly code: "not-submitted" | "empty-order" | "discount-over-cap") {
    super(code);
    this.name = "DoctorOrderSaleError";
  }
}

export function findDoctorOrderSaleError(error: unknown): DoctorOrderSaleError | null {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof DoctorOrderSaleError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

/**
 * Convierte un pedido del médico en una venta con varias líneas. El médico ya
 * fijó el total editable (base) y el descuento (con su tope); Administración solo
 * confirma y cobra ese total, sin ver los costos por producto. Es idempotente por
 * pedido: si ya existe la venta la devuelve.
 */
export async function confirmDoctorOrderSale(input: {
  doctorOrderId: string;
  workItemId?: string;
  createdById?: string;
  branchCode?: string;
  adminDiscountCents?: number;
  initialPaymentCents?: number;
  paymentMethodCode?: string;
  paymentReference?: string;
  notes?: string;
}) {
  return withDatabaseError("confirmDoctorOrderSale", async () => {
    return prisma.$transaction(async (tx) => {
      const order = await tx.doctorOrder.findUniqueOrThrow({
        where: { id: input.doctorOrderId },
        include: { lines: { orderBy: { position: "asc" } }, visit: { select: { branchCode: true } } }
      });
      const requiresNursing = order.lines.some((line) => line.requiresNursing);

      const existing = await tx.sale.findUnique({
        where: { doctorOrderId: input.doctorOrderId },
        include: { items: true }
      });
      if (existing) return { sale: existing, requiresNursing };

      if (order.status !== "submitted") throw new DoctorOrderSaleError("not-submitted");
      if (order.lines.length === 0) throw new DoctorOrderSaleError("empty-order");

      const branchCode = order.visit?.branchCode ?? input.branchCode ?? "el-alto";

      let lineSumCents = 0;
      for (const line of order.lines) {
        lineSumCents += line.unitPriceCents * line.quantity;
      }
      // Total editable del médico (base) y descuento libre (sin tope), acotado al
      // subtotal. Administración puede aplicar un descuento adicional al cobrar,
      // que se resta del total del médico (nunca deja el total en negativo).
      const subtotalCents = order.chargeBaseCents ?? lineSumCents;
      const doctorDiscountCents = Math.min(Math.max(0, order.orderDiscountCents), subtotalCents);
      const adminDiscountCents = Math.min(
        Math.max(0, input.adminDiscountCents ?? 0),
        subtotalCents - doctorDiscountCents
      );
      const discountCents = doctorDiscountCents + adminDiscountCents;
      const totalCents = Math.max(0, subtotalCents - discountCents);
      const initialPaymentCents = Math.min(Math.max(0, input.initialPaymentCents ?? 0), totalCents);
      const status = getSaleStatus(totalCents, initialPaymentCents);
      const cashSession =
        initialPaymentCents > 0 ? await getOpenCashSessionForOperation(tx, branchCode) : null;

      const sale = await tx.sale.create({
        data: {
          idempotencyKey: `doctor-order:${order.id}`,
          patientId: order.patientId,
          visitId: order.visitId,
          workItemId: input.workItemId,
          doctorOrderId: order.id,
          createdById: input.createdById,
          branchCode,
          status,
          subtotalCents,
          discountCents,
          totalCents,
          paidCents: initialPaymentCents,
          balanceCents: totalCents - initialPaymentCents,
          notes: input.notes ?? order.indications ?? undefined,
          items: {
            create: order.lines.map((line) => ({
              inventoryItemId: line.inventoryItemId,
              type: line.itemType,
              description: line.description,
              quantity: line.quantity,
              unitPriceCents: line.unitPriceCents,
              totalCents: line.unitPriceCents * line.quantity
            }))
          }
        },
        include: { items: true }
      });

      for (const line of order.lines) {
        if (!line.inventoryItemId) continue;
        const saleItem = sale.items.find(
          (candidate) => candidate.inventoryItemId === line.inventoryItemId
        );
        await applyInventoryMovement(tx, {
          itemId: line.inventoryItemId,
          saleId: sale.id,
          saleItemId: saleItem?.id,
          userId: input.createdById,
          branchCode,
          type: "automatic_sale_exit",
          quantityDelta: -line.quantity,
          reason: `Salida automática por venta ${sale.id}`
        });
        await tx.deliveredProduct.create({
          data: {
            saleId: sale.id,
            saleItemId: saleItem?.id,
            patientId: order.patientId,
            visitId: order.visitId,
            description: line.description,
            quantity: line.quantity
          }
        });
      }

      if (initialPaymentCents > 0) {
        const method = await ensurePaymentMethod(tx, input.paymentMethodCode ?? "cash");
        const payment = await tx.payment.create({
          data: {
            idempotencyKey: `doctor-order-payment:${order.id}`,
            saleId: sale.id,
            patientId: order.patientId,
            visitId: order.visitId,
            methodId: method.id,
            receivedById: input.createdById,
            branchCode,
            amountCents: initialPaymentCents,
            reference: input.paymentReference
          }
        });
        await tx.cashMovement.create({
          data: {
            idempotencyKey: `doctor-order-payment:${order.id}`,
            cashSessionId: cashSession?.id,
            saleId: sale.id,
            paymentId: payment.id,
            patientId: order.patientId,
            visitId: order.visitId,
            userId: input.createdById,
            branchCode,
            type: "income",
            channel: paymentCodeToCashChannel(input.paymentMethodCode ?? "cash"),
            amountCents: initialPaymentCents,
            description: `Cobro de venta ${sale.id}`
          }
        });
      }

      await tx.doctorOrder.update({
        where: { id: order.id },
        data: {
          status: "confirmed",
          confirmedAt: new Date(),
          discountApproved: discountCents > 0 ? true : null,
          discountDecidedById: discountCents > 0 ? input.createdById : null,
          discountDecidedAt: discountCents > 0 ? new Date() : null
        }
      });

      if (status === "paid") {
        await activateAwaitingPaymentFollowUps(tx, order.visitId);
      }

      // Si el pedido va a Enfermería, la tarea se cierra recién al derivar
      // (Tarea 4); si no, se completa al quedar pagada.
      if (input.workItemId && status === "paid" && !requiresNursing) {
        await tx.visitWorkItem.update({
          where: { id: input.workItemId },
          data: { status: "completed", completedAt: new Date() }
        });
      }

      return { sale, requiresNursing };
    });
  });
}

/**
 * Aplica un descuento adicional (de Administración) a una venta ya creada —p. ej.
 * el cobro de estudios/servicios de Enfermería (pago previo)—. El descuento se
 * acota al saldo pendiente (no se puede descontar por debajo de lo ya pagado) y
 * recalcula total, saldo y estado. Es aditivo sobre el descuento existente.
 */
export async function applyAdminDiscountToSale(input: {
  saleId: string;
  discountCents: number;
  userId?: string;
}) {
  return withDatabaseError("applyAdminDiscountToSale", async () => {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUniqueOrThrow({ where: { id: input.saleId } });
      const add = Math.min(Math.max(0, input.discountCents), sale.balanceCents);
      if (add === 0) return sale;

      const totalCents = Math.max(0, sale.totalCents - add);
      const discountCents = sale.discountCents + add;
      const balanceCents = Math.max(0, totalCents - sale.paidCents);
      const status = totalCents === 0 ? "paid" : getSaleStatus(totalCents, sale.paidCents);

      return tx.sale.update({
        where: { id: sale.id },
        data: { discountCents, totalCents, balanceCents, status }
      });
    });
  });
}

export async function createPaymentRecord(input: {
  idempotencyKey?: string;
  saleId: string;
  receivedById?: string;
  amountCents: number;
  paymentMethodCode: string;
  reference?: string;
  notes?: string;
  paidAt?: Date;
  branchCode?: string;
}) {
  return withDatabaseError("createPaymentRecord", async () => {
    return prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const reused = await tx.payment.findUnique({
          where: { idempotencyKey: input.idempotencyKey }
        });
        if (reused) return reused;
      }

      const sale = await tx.sale.findUniqueOrThrow({
        where: { id: input.saleId }
      });
      if (input.branchCode && sale.branchCode !== input.branchCode) {
        throw new Error("BRANCH_MISMATCH");
      }
      const amountCents = Math.min(input.amountCents, sale.balanceCents);
      if (amountCents <= 0) {
        throw new CashWorkflowError("invalid_amount");
      }
      const cashSession = await getOpenCashSessionForOperation(tx, sale.branchCode);
      const paidCents = sale.paidCents + amountCents;
      const balanceCents = Math.max(0, sale.totalCents - paidCents);
      const method = await ensurePaymentMethod(tx, input.paymentMethodCode);

      const payment = await tx.payment.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          saleId: sale.id,
          patientId: sale.patientId,
          visitId: sale.visitId,
          methodId: method.id,
          receivedById: input.receivedById,
          branchCode: sale.branchCode,
          amountCents,
          reference: input.reference,
          notes: input.notes,
          paidAt: input.paidAt ?? new Date()
        }
      });

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          paidCents,
          balanceCents,
          status: getSaleStatus(sale.totalCents, paidCents)
        }
      });

      await tx.cashMovement.create({
        data: {
          idempotencyKey: input.idempotencyKey
            ? `payment:${input.idempotencyKey}`
            : undefined,
          cashSessionId: cashSession.id,
          saleId: sale.id,
          paymentId: payment.id,
          patientId: sale.patientId,
          visitId: sale.visitId,
          userId: input.receivedById,
          branchCode: sale.branchCode,
          type: "income",
          channel: paymentCodeToCashChannel(input.paymentMethodCode),
          amountCents,
          description: `Cobro de venta ${sale.id}`
        }
      });

      if (sale.workItemId && balanceCents === 0) {
        const paidStudyOrders = await tx.clinicalOrder.count({
          where: { workItemId: sale.workItemId, type: "study", targetArea: "enfermeria" }
        });
        if (paidStudyOrders === 0) {
          await tx.visitWorkItem.update({
            where: { id: sale.workItemId },
            data: {
              status: "completed",
              completedAt: new Date()
            }
          });
        }
      }

      if (balanceCents === 0) {
        await activateAwaitingPaymentFollowUps(tx, sale.visitId);
      }

      return payment;
    });
  });
}

export async function getSaleById(id: string) {
  return withDatabaseError("getSaleById", async () => {
    return prisma.sale.findUnique({
      where: { id },
      include: {
        patient: true,
        visit: true,
        createdBy: true,
        items: true,
        payments: {
          include: {
            method: true,
            receivedBy: true,
            cashMovements: {
              include: {
                corrections: {
                  where: { type: "refund" },
                  select: { id: true, amountCents: true }
                }
              }
            }
          },
          orderBy: { paidAt: "desc" }
        }
      }
    });
  });
}

/**
 * ¿La visita tiene una venta registrada? (Tarea 7: el médico solo puede agendar
 * seguimiento si hubo compra). Devuelve la venta más reciente o null.
 */
export async function getVisitLatestSale(visitId: string) {
  return withDatabaseError("getVisitLatestSale", () =>
    prisma.sale.findFirst({
      where: { visitId },
      orderBy: { createdAt: "desc" },
      select: { id: true, totalCents: true, status: true }
    })
  );
}

export async function getPatientSales(patientId: string) {
  return withDatabaseError("getPatientSales", async () => {
    return prisma.sale.findMany({
      where: { patientId },
      include: {
        items: true,
        payments: { include: { method: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    });
  });
}

export async function getSalesSummary(date = new Date(), branchCode?: string) {
  return withDatabaseError("getSalesSummary", async () => {
    const today = dayRange(date);
    const month = monthRange(date);
    const [todaySales, monthSales, pendingSales] = await Promise.all([
      prisma.sale.aggregate({
        where: { branchCode, createdAt: { gte: today.start, lt: today.end } },
        _sum: { totalCents: true, paidCents: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: { branchCode, createdAt: { gte: month.start, lt: month.end } },
        _sum: { totalCents: true, paidCents: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: { branchCode, status: { in: ["pending", "partial"] } },
        _sum: { balanceCents: true },
        _count: true
      })
    ]);

    return { todaySales, monthSales, pendingSales };
  });
}
