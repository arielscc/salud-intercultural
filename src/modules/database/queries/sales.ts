import type { Prisma, SaleItemType } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import { applyInventoryMovement } from "@/modules/database/queries/inventory";

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

function dayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
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

export async function getAdministrationWorkItems(input: PaginationInput = {}) {
  const pagination = getPagination(input);

  return withDatabaseError("getAdministrationWorkItems", async () => {
    return prisma.visitWorkItem.findMany({
      where: {
        area: "administracion",
        status: {
          in: ["pending", "acknowledged", "in_progress", "blocked"]
        }
      },
      include: {
        createdBy: true,
        clinicalOrders: {
          include: { doctor: true },
          orderBy: { createdAt: "desc" }
        },
        visit: {
          include: {
            patient: true,
            route: true
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

export async function getAdministrationWorkItemById(id: string) {
  return withDatabaseError("getAdministrationWorkItemById", async () => {
    return prisma.visitWorkItem.findUnique({
      where: { id },
      include: {
        createdBy: true,
        clinicalOrders: {
          include: { doctor: true },
          orderBy: { createdAt: "desc" }
        },
        visit: {
          include: {
            patient: true,
            route: true
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
  patientId: string;
  visitId?: string;
  workItemId?: string;
  createdById?: string;
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
      const subtotalCents = input.quantity * input.unitPriceCents;
      const discountCents = Math.min(input.discountCents ?? 0, subtotalCents);
      const totalCents = Math.max(0, subtotalCents - discountCents);
      const initialPaymentCents = Math.min(input.initialPaymentCents ?? 0, totalCents);
      const status = getSaleStatus(totalCents, initialPaymentCents);

      const sale = await tx.sale.create({
        data: {
          patientId: input.patientId,
          visitId: input.visitId,
          workItemId: input.workItemId,
          createdById: input.createdById,
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
            saleId: sale.id,
            patientId: input.patientId,
            visitId: input.visitId,
            methodId: method.id,
            receivedById: input.createdById,
            amountCents: initialPaymentCents,
            reference: input.paymentReference
          }
        });

        await tx.cashMovement.create({
          data: {
            saleId: sale.id,
            paymentId: payment.id,
            patientId: input.patientId,
            visitId: input.visitId,
            userId: input.createdById,
            type: "income",
            amountCents: initialPaymentCents,
            description: `Cobro de venta ${sale.id}`
          }
        });
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

export async function createPaymentRecord(input: {
  saleId: string;
  receivedById?: string;
  amountCents: number;
  paymentMethodCode: string;
  reference?: string;
  notes?: string;
  paidAt?: Date;
}) {
  return withDatabaseError("createPaymentRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUniqueOrThrow({
        where: { id: input.saleId }
      });
      const amountCents = Math.min(input.amountCents, sale.balanceCents);
      const paidCents = sale.paidCents + amountCents;
      const balanceCents = Math.max(0, sale.totalCents - paidCents);
      const method = await ensurePaymentMethod(tx, input.paymentMethodCode);

      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          patientId: sale.patientId,
          visitId: sale.visitId,
          methodId: method.id,
          receivedById: input.receivedById,
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
          saleId: sale.id,
          paymentId: payment.id,
          patientId: sale.patientId,
          visitId: sale.visitId,
          userId: input.receivedById,
          type: "income",
          amountCents,
          description: `Cobro de venta ${sale.id}`
        }
      });

      if (sale.workItemId && balanceCents === 0) {
        await tx.visitWorkItem.update({
          where: { id: sale.workItemId },
          data: {
            status: "completed",
            completedAt: new Date()
          }
        });
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
            receivedBy: true
          },
          orderBy: { paidAt: "desc" }
        }
      }
    });
  });
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

export async function getSalesSummary(date = new Date()) {
  return withDatabaseError("getSalesSummary", async () => {
    const today = dayRange(date);
    const month = monthRange(date);
    const [todaySales, monthSales, pendingSales] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: today.start, lt: today.end } },
        _sum: { totalCents: true, paidCents: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: month.start, lt: month.end } },
        _sum: { totalCents: true, paidCents: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: { status: { in: ["pending", "partial"] } },
        _sum: { balanceCents: true },
        _count: true
      })
    ]);

    return { todaySales, monthSales, pendingSales };
  });
}
