import type {
  DoctorOrderLineSource,
  Prisma,
  SaleItemType,
  ServiceSessionPricingMode
} from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { computeServiceCatalogMaxDiscountCents } from "@/modules/database/queries/service-catalog";
import { updateVisitRouteStatusInTransaction } from "@/modules/database/queries/visits";

export class DoctorOrderError extends Error {
  constructor(
    public readonly code:
      | "empty-order"
      | "discount-over-cap"
      | "consultation-not-finalized"
      | "visit-not-in-consultation"
      | "already-confirmed"
      | "invalid-line"
  ) {
    super(code);
    this.name = "DoctorOrderError";
  }
}

export function findDoctorOrderError(error: unknown): DoctorOrderError | null {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof DoctorOrderError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

export class DoctorOrderNursingError extends Error {
  constructor(
    public readonly code: "not-confirmed" | "payment-required" | "no-nursing-services"
  ) {
    super(code);
    this.name = "DoctorOrderNursingError";
  }
}

export function findDoctorOrderNursingError(error: unknown): DoctorOrderNursingError | null {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof DoctorOrderNursingError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

export type DoctorOrderLineInput = {
  source: DoctorOrderLineSource;
  itemType: SaleItemType;
  catalogItemId?: string;
  inventoryItemId?: string;
  description: string;
  unitPriceCents: number;
  discountCents: number;
  quantity: number;
  sessionCount?: number;
  pricingMode?: ServiceSessionPricingMode;
  notes?: string;
};

export async function getDoctorOrderByVisit(visitId: string) {
  return withDatabaseError("getDoctorOrderByVisit", () =>
    prisma.doctorOrder.findUnique({
      where: { visitId },
      include: {
        doctor: { select: { id: true, name: true, email: true } },
        lines: { orderBy: { position: "asc" } }
      }
    })
  );
}

/**
 * Opciones vendibles para el selector del médico: servicios y tratamientos del
 * catálogo (con su tope de descuento por unidad) y productos del inventario.
 */
export async function getDoctorOrderOptions() {
  return withDatabaseError("getDoctorOrderOptions", async () => {
    const [catalog, products] = await Promise.all([
      prisma.serviceCatalogItem.findMany({
        where: { active: true, kind: { in: ["service", "treatment"] } },
        include: {
          components: { include: { inventoryItem: true }, orderBy: { createdAt: "asc" } }
        },
        orderBy: [{ kind: "asc" }, { name: "asc" }]
      }),
      prisma.inventoryItem.findMany({
        where: { active: true },
        select: { id: true, name: true, salePriceCents: true, maxDiscountCents: true },
        orderBy: { name: "asc" }
      })
    ]);

    const catalogOptions = catalog.map((item) => ({
      source: (item.kind === "treatment" ? "treatment" : "service") as DoctorOrderLineSource,
      itemType: (item.kind === "treatment" ? "treatment" : "service") as SaleItemType,
      catalogItemId: item.id,
      label: item.name,
      unitPriceCents: item.basePriceCents,
      perUnitCapCents: computeServiceCatalogMaxDiscountCents(item),
      requiresNursing: item.requiresNursing,
      supportsSessions: item.supportsSessions,
      sessionCount: item.sessionCount,
      packagePriceCents: item.packagePriceCents,
      sessionPriceCents: item.sessionPriceCents
    }));

    const productOptions = products.map((product) => ({
      source: "product" as DoctorOrderLineSource,
      itemType: "product" as SaleItemType,
      inventoryItemId: product.id,
      label: product.name,
      unitPriceCents: product.salePriceCents,
      perUnitCapCents: product.maxDiscountCents,
      requiresNursing: false,
      supportsSessions: false,
      sessionCount: null,
      packagePriceCents: null,
      sessionPriceCents: null
    }));

    return { catalogOptions, productOptions };
  });
}

/**
 * Metadatos de una línea resueltos siempre desde la base: tope de descuento por
 * unidad y si la oferta se ejecuta en Enfermería (pago previo, Tarea 4).
 */
async function resolveLineMeta(
  tx: Prisma.TransactionClient,
  line: DoctorOrderLineInput
): Promise<{ perUnitCapCents: number; requiresNursing: boolean }> {
  if (line.source === "product") {
    if (!line.inventoryItemId) throw new DoctorOrderError("invalid-line");
    const product = await tx.inventoryItem.findUnique({
      where: { id: line.inventoryItemId },
      select: { active: true, maxDiscountCents: true }
    });
    if (!product || !product.active) throw new DoctorOrderError("invalid-line");
    return { perUnitCapCents: product.maxDiscountCents, requiresNursing: false };
  }

  if (line.source === "service" || line.source === "treatment") {
    if (!line.catalogItemId) throw new DoctorOrderError("invalid-line");
    const catalogItem = await tx.serviceCatalogItem.findUnique({
      where: { id: line.catalogItemId },
      include: {
        components: { include: { inventoryItem: true } }
      }
    });
    if (!catalogItem || !catalogItem.active) throw new DoctorOrderError("invalid-line");
    return {
      perUnitCapCents: computeServiceCatalogMaxDiscountCents(catalogItem),
      requiresNursing: catalogItem.requiresNursing
    };
  }

  // free_text: sin umbral, no admite descuento ni ejecución en Enfermería.
  return { perUnitCapCents: 0, requiresNursing: false };
}

export async function saveDoctorOrder(input: {
  visitId: string;
  doctorId: string;
  indications?: string;
  chargeBaseCents?: number;
  orderDiscountCents?: number;
  lines: DoctorOrderLineInput[];
  submit: boolean;
}) {
  return withDatabaseError("saveDoctorOrder", async () =>
    prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUniqueOrThrow({
        where: { id: input.visitId },
        include: {
          clinicalConsultation: { select: { id: true, status: true } },
          doctorOrder: true
        }
      });

      if (visit.doctorOrder?.status === "confirmed") {
        throw new DoctorOrderError("already-confirmed");
      }
      if (input.submit) {
        if (input.lines.length === 0) throw new DoctorOrderError("empty-order");
        if (visit.status !== "in_consultation" && visit.status !== "in_administration") {
          throw new DoctorOrderError("visit-not-in-consultation");
        }
      }

      // El descuento es libre (lo definen el médico y Administración): sin tope.
      const resolvedLines = [] as Array<
        DoctorOrderLineInput & {
          maxDiscountCents: number;
          requiresNursing: boolean;
          position: number;
        }
      >;
      for (const [position, line] of input.lines.entries()) {
        const meta = await resolveLineMeta(tx, line);
        resolvedLines.push({
          ...line,
          maxDiscountCents: 0,
          requiresNursing: meta.requiresNursing,
          position
        });
      }
      const orderDiscountCents = Math.max(0, input.orderDiscountCents ?? 0);

      const order = await tx.doctorOrder.upsert({
        where: { visitId: input.visitId },
        create: {
          visitId: input.visitId,
          patientId: visit.patientId,
          doctorId: input.doctorId,
          indications: input.indications,
          chargeBaseCents: input.chargeBaseCents ?? null,
          orderDiscountCents,
          status: input.submit ? "submitted" : "draft",
          submittedAt: input.submit ? new Date() : null
        },
        update: {
          doctorId: input.doctorId,
          indications: input.indications,
          chargeBaseCents: input.chargeBaseCents ?? null,
          orderDiscountCents,
          status: input.submit ? "submitted" : "draft",
          submittedAt: input.submit ? new Date() : null
        }
      });

      await tx.doctorOrderLine.deleteMany({ where: { orderId: order.id } });
      for (const line of resolvedLines) {
        await tx.doctorOrderLine.create({
          data: {
            orderId: order.id,
            source: line.source,
            itemType: line.itemType,
            catalogItemId: line.catalogItemId,
            inventoryItemId: line.inventoryItemId,
            description: line.description,
            unitPriceCents: line.unitPriceCents,
            discountCents: line.discountCents,
            quantity: line.quantity,
            sessionCount: line.sessionCount,
            pricingMode: line.pricingMode,
            maxDiscountCents: line.maxDiscountCents,
            requiresNursing: line.requiresNursing,
            notes: line.notes,
            position: line.position
          }
        });
      }

      // Derivar a Administración (enviar el pedido) registra automáticamente el
      // resultado de la propuesta como "aceptado", con la instrucción del pedido,
      // para alimentar los reportes sin un formulario aparte. No se duplica la
      // orden: el DoctorOrder ya es la orden a Administración.
      // Pendiente: capturar los demás estados (rechazado, necesita tiempo, no
      // aplica, sin decisión) desde otras acciones del proceso de atención.
      if (input.submit && visit.clinicalConsultation?.status === "finalized") {
        const latestOutcome = await tx.treatmentProposalOutcome.findFirst({
          where: { visitId: visit.id },
          orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }]
        });
        if (latestOutcome?.status !== "accepted") {
          await tx.treatmentProposalOutcome.create({
            data: {
              consultationId: visit.clinicalConsultation.id,
              visitId: visit.id,
              doctorId: input.doctorId,
              status: "accepted",
              reason: "agreed_to_start",
              administrationInstruction: input.indications || null,
              supersedesId: latestOutcome?.id
            }
          });
        }
      }

      return tx.doctorOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: { lines: { orderBy: { position: "asc" } } }
      });
    })
  );
}

/**
 * Deriva a Enfermería las líneas que se ejecutan ahí (suero/servicio), pero solo
 * si la venta del pedido ya está pagada (Tarea 4). Crea la tarea de Enfermería
 * con la orden e indicaciones del médico y mueve la visita a Enfermería. Es
 * idempotente: si ya se derivó, devuelve la tarea existente.
 */
export async function releaseDoctorOrderToNursing(input: {
  doctorOrderId: string;
  userId?: string;
}) {
  return withDatabaseError("releaseDoctorOrderToNursing", () =>
    prisma.$transaction(async (tx) => {
      const order = await tx.doctorOrder.findUniqueOrThrow({
        where: { id: input.doctorOrderId },
        include: { lines: { orderBy: { position: "asc" } }, sale: true }
      });

      if (order.nursingReleasedAt && order.nursingWorkItemId) {
        return tx.visitWorkItem.findUnique({ where: { id: order.nursingWorkItemId } });
      }
      if (order.status !== "confirmed" || !order.sale) {
        throw new DoctorOrderNursingError("not-confirmed");
      }
      if (order.sale.balanceCents > 0) {
        throw new DoctorOrderNursingError("payment-required");
      }

      const nursingLines = order.lines.filter((line) => line.requiresNursing);
      if (nursingLines.length === 0) {
        throw new DoctorOrderNursingError("no-nursing-services");
      }

      const { workItem: nursing } = await updateVisitRouteStatusInTransaction(tx, {
        visitId: order.visitId,
        userId: input.userId,
        status: "in_nursing",
        area: "enfermeria",
        note: "Pago confirmado; enviado a Enfermería",
        workItemTitle: "Aplicar servicios pagados",
        workItemDescription: nursingLines.map((line) => line.description).join(", ")
      });

      for (const line of nursingLines) {
        await tx.clinicalOrder.create({
          data: {
            visitId: order.visitId,
            patientId: order.patientId,
            doctorId: order.doctorId,
            workItemId: nursing.id,
            type: "nursing_application",
            targetArea: "enfermeria",
            status: "pending",
            title: line.description,
            details: line.notes ?? order.indications ?? undefined
          }
        });

        // Servicio por sesiones (Tarea 5): crea el paquete pagado para
        // consumir a lo largo de varias visitas. Precios en fotografía.
        if (line.pricingMode) {
          const totalSessions =
            line.pricingMode === "package" ? line.sessionCount ?? 1 : line.quantity;
          await tx.serviceSessionPackage.create({
            data: {
              patientId: order.patientId,
              catalogItemId: line.catalogItemId,
              serviceName: line.description,
              originVisitId: order.visitId,
              doctorOrderId: order.id,
              saleId: order.sale.id,
              pricingMode: line.pricingMode,
              totalSessions: Math.max(1, totalSessions),
              packagePriceCents: line.pricingMode === "package" ? line.unitPriceCents : null,
              sessionPriceCents: line.pricingMode === "per_session" ? line.unitPriceCents : null,
              totalPaidCents: line.unitPriceCents * line.quantity
            }
          });
        }
      }

      if (order.sale.workItemId) {
        await tx.visitWorkItem.update({
          where: { id: order.sale.workItemId },
          data: { status: "completed", completedAt: new Date() }
        });
      }

      await tx.doctorOrder.update({
        where: { id: order.id },
        data: { nursingReleasedAt: new Date(), nursingWorkItemId: nursing.id }
      });

      return nursing;
    })
  );
}
