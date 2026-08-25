import type {
  CashChannel,
  PatientRouteArea,
  Prisma,
  SaleItemType,
  SaleStatus,
  VisitStatus,
  VisitWorkItemStatus
} from "@/generated/prisma/client";
import { dayRange, monthRange } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import { applyInventoryMovement } from "@/modules/database/queries/inventory";
import {
  CashWorkflowError,
  getOpenCashSessionForOperation
} from "@/modules/database/queries/cash";
import { patientSearchWhere } from "@/modules/database/queries/patient-search";
import { updateVisitRouteStatusInTransaction } from "@/modules/database/queries/visits";

const paymentMethodNames: Record<string, string> = {
  cash: "Efectivo",
  qr: "QR",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro"
};

const activeWorkItemStatuses: VisitWorkItemStatus[] = [
  "pending",
  "acknowledged",
  "in_progress"
];

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
  const receptionAssignee = await tx.internalUser.findFirst({
    where: { active: true, role: "recepcion" },
    orderBy: [
      { name: "asc" },
      { createdAt: "asc" }
    ],
    select: { id: true }
  });
  const pending = await tx.followUpTask.findMany({
    where: { visitId, status: "awaiting_payment" },
    select: { id: true, assignedToId: true }
  });
  if (pending.length === 0) return;
  await Promise.all(
    pending.map((task) =>
      tx.followUpTask.update({
        where: { id: task.id },
        data: {
          status: "pending",
          assignedToId: task.assignedToId ?? receptionAssignee?.id
        }
      })
    )
  );
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

async function completeDoctorOrderPaidVisit(
  tx: Prisma.TransactionClient,
  input: {
    visitId: string;
    userId?: string;
  }
) {
  await tx.visitWorkItem.updateMany({
    where: {
      visitId: input.visitId,
      status: { in: activeWorkItemStatuses }
    },
    data: { status: "completed", completedAt: new Date() }
  });
  await updateVisitRouteStatusInTransaction(tx, {
    visitId: input.visitId,
    userId: input.userId,
    status: "completed",
    area: "cierre",
    note: "Tratamiento pagado en Administración. Visita finalizada.",
    workItemTitle: "Tratamiento pagado",
    workItemDescription:
      "El cobro quedó saldado y los seguimientos pendientes pasaron a Recepción."
  });
}

function paymentCodeToCashChannel(code: string): CashChannel {
  return code === "qr" ? "qr" : "cash";
}

export async function getAdministrationWorkItems(
  input: PaginationInput & { branchCode?: string } = {}
) {
  const pagination = getPagination(input);
  const today = dayRange();

  return withDatabaseError("getAdministrationWorkItems", async () => {
    return prisma.visitWorkItem.findMany({
      where: {
        visit: { branchCode: input.branchCode },
        area: "administracion",
        OR: [
          {
            status: {
              in: ["pending", "acknowledged", "in_progress", "blocked"]
            }
          },
          {
            // Lo cobrado hoy no desaparece de la bandeja al completar el
            // pendiente: Administracion necesita seguir viendo al paciente
            // (venta directa o pedido del medico) durante el resto del dia.
            status: "completed",
            completedAt: { gte: today.start, lt: today.end },
            sales: { some: {} }
          }
        ]
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
            doctorOrder: {
              select: {
                status: true,
                chargeBaseCents: true,
                orderDiscountCents: true,
                lines: { select: { unitPriceCents: true, quantity: true } }
              }
            }
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
        visit: {
          include: {
            patient: true,
            route: true,
            doctorOrder: {
              select: {
                status: true,
                chargeBaseCents: true,
                orderDiscountCents: true,
                lines: { select: { unitPriceCents: true, quantity: true } }
              }
            }
          }
        },
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

export async function assignAdministrationWorkItem(input: {
  workItemId: string;
  userId: string;
  branchCode?: string;
}) {
  return withDatabaseError("assignAdministrationWorkItem", async () => {
    return prisma.$transaction(async (tx) => {
      const workItem = await tx.visitWorkItem.findUniqueOrThrow({
        where: { id: input.workItemId },
        select: {
          id: true,
          visitId: true,
          area: true,
          status: true,
          visit: { select: { branchCode: true } }
        }
      });

      if (
        workItem.area !== "administracion" ||
        (input.branchCode && workItem.visit.branchCode !== input.branchCode)
      ) {
        throw new Error("ADMINISTRATION_WORK_ITEM_NOT_AVAILABLE");
      }

      const shouldStart =
        workItem.status === "pending" || workItem.status === "acknowledged";
      const updated = await tx.visitWorkItem.update({
        where: { id: input.workItemId },
        data: {
          assignedToId: input.userId,
          assignedAt: new Date(),
          status: shouldStart ? "in_progress" : workItem.status
        }
      });

      return { ...updated, visitId: workItem.visitId };
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

      if (input.workItemId && status === "paid") {
        await tx.visitWorkItem.update({
          where: { id: input.workItemId },
          data: { status: "completed", completedAt: new Date() }
        });
      }

      if (status === "paid") {
        await completeDoctorOrderPaidVisit(tx, {
          visitId: order.visitId,
          userId: input.createdById
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
          where: { idempotencyKey: input.idempotencyKey },
          include: {
            sale: {
              select: {
                id: true,
                status: true,
                balanceCents: true,
                workItemId: true,
                doctorOrderId: true,
                visitId: true
              }
            }
          }
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

      const updatedSale = await tx.sale.update({
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

      if (balanceCents === 0 && sale.doctorOrderId && sale.visitId) {
        await completeDoctorOrderPaidVisit(tx, {
          visitId: sale.visitId,
          userId: input.receivedById
        });
      }

      return {
        ...payment,
        sale: {
          id: updatedSale.id,
          status: updatedSale.status,
          balanceCents: updatedSale.balanceCents,
          workItemId: updatedSale.workItemId,
          doctorOrderId: updatedSale.doctorOrderId,
          visitId: updatedSale.visitId
        }
      };
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

export type TodayCollection = {
  saleId: string;
  workItemId: string | null;
  patient: { id: string; fullName: string; internalCode: string };
  concept: string[];
  status: SaleStatus;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  /** Solo lo cobrado hoy; la venta puede traer pagos de dias anteriores. */
  paidTodayCents: number;
  lastPaidAt: Date;
  methods: string[];
  visitStatus: VisitStatus | null;
  currentArea: PatientRouteArea | null;
};

/**
 * Pacientes que pagaron hoy, agrupados por venta. Se arma desde los pagos y no
 * desde los pendientes de Administracion, para que un cobro siga visible aunque
 * el pendiente ya se haya completado, la venta no venga de un pedido del medico
 * o el paciente ya haya seguido a otra area.
 */
export async function getTodayCollections(
  branchCode?: string,
  date = new Date()
) {
  const today = dayRange(date);

  return withDatabaseError("getTodayCollections", async () => {
    const payments = await prisma.payment.findMany({
      where: { branchCode, paidAt: { gte: today.start, lt: today.end } },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        amountCents: true,
        paidAt: true,
        method: { select: { name: true } },
        patient: { select: { id: true, fullName: true, internalCode: true } },
        sale: {
          select: {
            id: true,
            status: true,
            totalCents: true,
            paidCents: true,
            balanceCents: true,
            workItemId: true,
            items: {
              select: { description: true },
              orderBy: { createdAt: "asc" }
            },
            visit: {
              select: {
                id: true,
                status: true,
                route: { select: { currentArea: true } }
              }
            }
          }
        }
      }
    });

    const bySale = new Map<string, TodayCollection>();

    for (const payment of payments) {
      const sale = payment.sale;
      const existing = bySale.get(sale.id);
      if (existing) {
        existing.paidTodayCents += payment.amountCents;
        if (!existing.methods.includes(payment.method.name)) {
          existing.methods.push(payment.method.name);
        }
        continue;
      }
      bySale.set(sale.id, {
        saleId: sale.id,
        workItemId: sale.workItemId,
        patient: payment.patient,
        concept: sale.items.map((item) => item.description),
        status: sale.status,
        totalCents: sale.totalCents,
        paidCents: sale.paidCents,
        balanceCents: sale.balanceCents,
        paidTodayCents: payment.amountCents,
        // `payments` viene ordenado de mas reciente a mas antiguo.
        lastPaidAt: payment.paidAt,
        methods: [payment.method.name],
        visitStatus: sale.visit?.status ?? null,
        currentArea: sale.visit?.route?.currentArea ?? null
      });
    }

    const collections = Array.from(bySale.values());

    return {
      collections,
      paidTodayCents: collections.reduce(
        (total, entry) => total + entry.paidTodayCents,
        0
      ),
      patientCount: new Set(collections.map((entry) => entry.patient.id)).size
    };
  });
}

export type SaleListInput = PaginationInput & {
  /** Nombre, teléfono o código interno del cliente. */
  search?: string;
  status?: SaleStatus;
  from?: Date;
  to?: Date;
  branchCode?: string;
};

function saleListWhere(input: SaleListInput): Prisma.SaleWhereInput {
  return {
    AND: [
      input.branchCode ? { branchCode: input.branchCode } : {},
      input.status ? { status: input.status } : {},
      input.from || input.to
        ? { createdAt: { gte: input.from, lt: input.to } }
        : {},
      // La búsqueda es del cliente, no de la venta: quien atiende recuerda a la
      // persona, no el número de la venta.
      input.search ? { patient: patientSearchWhere(input.search) } : {}
    ]
  };
}

/**
 * Ventas para el listado de Administración, de la más reciente a la más
 * antigua. Trae solo los primeros conceptos de cada venta y su cantidad total:
 * alcanza para reconocerla en la fila y evita cargar el detalle completo de
 * cada una.
 */
export async function getSalesPage(input: SaleListInput = {}) {
  const pagination = getPagination(input);

  return withDatabaseError("getSalesPage", async () => {
    return prisma.sale.findMany({
      where: saleListWhere(input),
      select: {
        id: true,
        createdAt: true,
        status: true,
        totalCents: true,
        paidCents: true,
        balanceCents: true,
        visitId: true,
        patient: {
          select: { id: true, fullName: true, phone: true, internalCode: true }
        },
        createdBy: { select: { name: true, email: true } },
        items: {
          select: { id: true, description: true, type: true },
          orderBy: { createdAt: "asc" },
          take: 3
        },
        _count: { select: { items: true } }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: pagination.skip,
      take: pagination.take
    });
  });
}

export async function countSales(input: SaleListInput = {}) {
  return withDatabaseError("countSales", async () => {
    return prisma.sale.count({ where: saleListWhere(input) });
  });
}

/**
 * Totales del conjunto filtrado. Se calculan en servidor y sobre la misma
 * condición del listado, para que lo que suma la pantalla coincida con lo que
 * muestran el detalle y la Caja.
 */
export async function getSalesPageTotals(input: SaleListInput = {}) {
  return withDatabaseError("getSalesPageTotals", async () => {
    const totals = await prisma.sale.aggregate({
      where: saleListWhere(input),
      _sum: { totalCents: true, paidCents: true, balanceCents: true }
    });

    return {
      totalCents: totals._sum.totalCents ?? 0,
      paidCents: totals._sum.paidCents ?? 0,
      balanceCents: totals._sum.balanceCents ?? 0
    };
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
