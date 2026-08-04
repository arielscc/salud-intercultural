import type { Prisma } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import {
  appendAreaEnteredEvent,
  appendAreaExitedEvents
} from "@/modules/database/queries/area-times";
import type { PaidStudyOrderInput } from "@/features/clinical-care/schemas/paid-study.schema";

export function hasPaidStudyFlowError(error: unknown, code: string): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message === code) return true;
  return "cause" in error && hasPaidStudyFlowError(error.cause, code);
}

function toCents(value: string) {
  return Math.round(Number(value) * 100);
}

async function moveVisit(
  tx: Prisma.TransactionClient,
  input: { visitId: string; userId?: string; status: "in_administration" | "in_nursing" | "in_consultation"; area: "administracion" | "enfermeria" | "medico"; note: string }
) {
  const visit = await tx.visit.findUniqueOrThrow({ where: { id: input.visitId }, include: { route: true } });
  const now = new Date();
  await tx.visit.update({ where: { id: input.visitId }, data: { status: input.status } });
  await tx.visitStatusHistory.create({
    data: { visitId: input.visitId, userId: input.userId, fromStatus: visit.status, toStatus: input.status, note: input.note }
  });
  if (visit.route) {
    const openSteps = await tx.patientRouteStep.findMany({
      where: { routeId: visit.route.id, endedAt: null },
      select: { id: true, area: true }
    });
    await appendAreaExitedEvents(tx, {
      visitId: input.visitId,
      routeStepIds: openSteps.map((step) => step.id),
      areaByStepId: new Map(openSteps.map((step) => [step.id, step.area])),
      occurredAt: now,
      recordedById: input.userId
    });
    await tx.patientRouteStep.updateMany({ where: { routeId: visit.route.id, endedAt: null }, data: { endedAt: now } });
    await tx.patientRoute.update({ where: { id: visit.route.id }, data: { currentArea: input.area, active: true } });
    const nextStep = await tx.patientRouteStep.create({ data: { routeId: visit.route.id, area: input.area, status: input.status, note: input.note } });
    await appendAreaEnteredEvent(tx, {
      visitId: input.visitId,
      routeStepId: nextStep.id,
      area: input.area,
      occurredAt: nextStep.startedAt,
      recordedById: input.userId
    });
  }
}

export class PaidStudyCatalogError extends Error {
  constructor(public readonly code: "invalid-study") {
    super(code);
    this.name = "PaidStudyCatalogError";
  }
}

export async function createPaidStudyOrder(
  input: PaidStudyOrderInput & {
    doctorId?: string;
    requestedById?: string;
    source?: "consultation" | "reception" | "nursing";
  }
) {
  return withDatabaseError("createPaidStudyOrder", () =>
    prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUniqueOrThrow({ where: { id: input.visitId }, include: { patient: true } });

      const catalogIds = [
        ...new Set(
          input.studies
            .map((study) => study.catalogItemId)
            .filter((id): id is string => Boolean(id))
        )
      ];
      const inventoryIds = [
        ...new Set(
          input.studies
            .map((study) => study.inventoryItemId)
            .filter((id): id is string => Boolean(id))
        )
      ];

      // Se admiten estudios y servicios que se ejecutan en Enfermería, más
      // productos de inventario (p. ej. inyectables solicitados por el paciente).
      const [catalogItems, inventoryItems] = await Promise.all([
        catalogIds.length > 0
          ? tx.serviceCatalogItem.findMany({
              where: {
                id: { in: catalogIds },
                active: true,
                OR: [{ kind: "study" }, { requiresNursing: true }]
              },
              select: {
                id: true,
                name: true,
                kind: true,
                supportsSessions: true,
                sessionCount: true
              }
            })
          : Promise.resolve([]),
        inventoryIds.length > 0
          ? tx.inventoryItem.findMany({
              where: { id: { in: inventoryIds }, active: true },
              select: { id: true, name: true }
            })
          : Promise.resolve([])
      ]);

      const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
      const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
      if (catalogById.size !== catalogIds.length || inventoryById.size !== inventoryIds.length) {
        throw new PaidStudyCatalogError("invalid-study");
      }

      const lines = input.studies.map((study) => {
        const quantity = Math.max(1, study.quantity ?? 1);
        const unitPriceCents = toCents(study.price);
        if (study.inventoryItemId) {
          const product = inventoryById.get(study.inventoryItemId)!;
          return {
            catalogItemId: undefined,
            title: product.name,
            unitPriceCents,
            quantity,
            kind: "product" as const,
            supportsSessions: false,
            sessionCount: null as number | null
          };
        }
        const item = catalogById.get(study.catalogItemId!)!;
        return {
          catalogItemId: study.catalogItemId,
          title: item.name,
          unitPriceCents,
          quantity,
          kind: item.kind === "study" ? ("study" as const) : ("service" as const),
          supportsSessions: item.supportsSessions,
          sessionCount: item.sessionCount
        };
      });
      const lineSumCents = lines.reduce(
        (total, line) => total + line.unitPriceCents * line.quantity,
        0
      );
      // Total editable del médico (base) y descuento libre (sin tope), acotado al subtotal.
      const subtotalCents = input.total ? toCents(input.total) : lineSumCents;
      const discountCents = Math.min(Math.max(0, toCents(input.discount)), subtotalCents);
      const totalCents = Math.max(0, subtotalCents - discountCents);
      const description = lines.map((line) => line.title).join(", ");

      const workItem = await tx.visitWorkItem.create({
        data: {
          visitId: visit.id,
          createdById: input.requestedById ?? input.doctorId,
          area: "administracion",
          title: "Cobro de estudios/servicios",
          description
        }
      });
      await tx.clinicalOrder.createMany({
        data: lines.map((line) => ({
          visitId: visit.id,
          patientId: visit.patientId,
          doctorId: input.doctorId,
          workItemId: workItem.id,
          type: line.kind === "study" ? ("study" as const) : ("nursing_application" as const),
          targetArea: "enfermeria" as const,
          title: line.title,
          details: input.details
        }))
      });
      const sale = await tx.sale.create({
        data: {
          patientId: visit.patientId,
          visitId: visit.id,
          workItemId: workItem.id,
          status: totalCents === 0 ? "paid" : "pending",
          subtotalCents,
          discountCents,
          totalCents,
          balanceCents: totalCents,
          notes:
            input.source === "reception"
              ? "Orden de cobro de enfermería generada desde recepción"
              : input.source === "nursing"
                ? "Orden de cobro solicitada por Enfermería (servicio adicional)"
                : "Orden de cobro de enfermería generada desde consulta médica",
          items: {
            create: lines.map((line) => ({
              type:
                line.kind === "study"
                  ? ("study" as const)
                  : line.kind === "product"
                    ? ("product" as const)
                    : ("service" as const),
              description: line.title,
              quantity: line.quantity,
              unitPriceCents: line.unitPriceCents,
              totalCents: line.unitPriceCents * line.quantity
            }))
          }
        }
      });
      // Servicios por sesiones (sueroterapia, ozono): la cantidad pedida en la
      // orden es el número de sesiones (p. ej. Ozonoterapia ×3 = 3 sesiones), y lo
      // pagado es el precio unitario × esa cantidad.
      for (const line of lines) {
        if (!line.supportsSessions) continue;
        const sessions = Math.max(1, line.quantity);
        const paidCents = line.unitPriceCents * sessions;
        await tx.serviceSessionPackage.create({
          data: {
            patientId: visit.patientId,
            catalogItemId: line.catalogItemId,
            serviceName: line.title,
            originVisitId: visit.id,
            saleId: sale.id,
            pricingMode: "package",
            totalSessions: sessions,
            packagePriceCents: paidCents,
            sessionPriceCents: line.unitPriceCents,
            totalPaidCents: paidCents
          }
        });
      }
      await moveVisit(tx, {
        visitId: visit.id,
        userId: input.requestedById ?? input.doctorId,
        status: "in_administration",
        area: "administracion",
        note: `Pendiente de pago: ${description}`
      });
      return { sale, workItem };
    })
  );
}

export async function releasePaidStudiesToNursing(input: { workItemId: string; userId?: string }) {
  return withDatabaseError("releasePaidStudiesToNursing", () =>
    prisma.$transaction(async (tx) => {
      const billing = await tx.visitWorkItem.findUniqueOrThrow({
        where: { id: input.workItemId },
        include: { sales: true, clinicalOrders: true }
      });
      if (billing.sales.length === 0 || billing.sales.some((sale) => sale.balanceCents > 0)) {
        throw new Error("STUDY_PAYMENT_REQUIRED");
      }
      const orders = billing.clinicalOrders.filter(
        (order) => order.type === "study" || order.type === "nursing_application"
      );
      if (orders.length === 0) throw new Error("STUDY_ORDERS_REQUIRED");
      // Si la enfermera ya tiene una tarea abierta para esta visita (p. ej. derivó
      // a Administración sin cerrarla), se reutiliza para no duplicar al paciente
      // en la cola. Si no existe (flujo desde consulta/recepción), se crea una.
      const existingNursing = await tx.visitWorkItem.findFirst({
        where: {
          visitId: billing.visitId,
          area: "enfermeria",
          status: { in: ["pending", "acknowledged", "in_progress", "blocked"] }
        },
        orderBy: { createdAt: "asc" }
      });
      const nursing =
        existingNursing ??
        (await tx.visitWorkItem.create({
          data: {
            visitId: billing.visitId,
            createdById: input.userId,
            area: "enfermeria",
            title: "Realizar estudios/servicios pagados",
            description: orders.map((order) => order.title).join(", ")
          }
        }));
      await tx.clinicalOrder.updateMany({ where: { id: { in: orders.map((order) => order.id) } }, data: { workItemId: nursing.id } });
      await tx.visitWorkItem.update({ where: { id: billing.id }, data: { status: "completed", completedAt: new Date() } });
      await moveVisit(tx, { visitId: billing.visitId, userId: input.userId, status: "in_nursing", area: "enfermeria", note: "Pago confirmado; enviado a enfermería" });
      return nursing;
    })
  );
}

// Derivación general de Enfermería al médico: cierra la tarea de enfermería y
// devuelve la visita a consulta. Sin candado de estudios: manda al paciente con
// todo lo registrado (signos, aplicaciones, estudios ya visibles para el médico).
export async function deriveNursingPatientToDoctor(input: { workItemId: string; userId?: string }) {
  return withDatabaseError("deriveNursingPatientToDoctor", () =>
    prisma.$transaction(async (tx) => {
      const nursing = await tx.visitWorkItem.findUniqueOrThrow({
        where: { id: input.workItemId }
      });
      await tx.visitWorkItem.update({
        where: { id: nursing.id },
        data: { status: "completed", completedAt: new Date() }
      });
      await moveVisit(tx, {
        visitId: nursing.visitId,
        userId: input.userId,
        status: "in_consultation",
        area: "medico",
        note: "Enfermería devolvió el paciente al médico"
      });
    })
  );
}

export async function returnCompletedStudiesToDoctor(input: { workItemId: string; userId?: string }) {
  return withDatabaseError("returnCompletedStudiesToDoctor", () =>
    prisma.$transaction(async (tx) => {
      const nursing = await tx.visitWorkItem.findUniqueOrThrow({ where: { id: input.workItemId }, include: { clinicalOrders: true } });
      const studies = nursing.clinicalOrders.filter((order) => order.type === "study");
      if (studies.length === 0 || studies.some((order) => order.status !== "completed")) throw new Error("STUDIES_INCOMPLETE");
      await tx.visitWorkItem.update({ where: { id: nursing.id }, data: { status: "completed", completedAt: new Date() } });
      await moveVisit(tx, { visitId: nursing.visitId, userId: input.userId, status: "in_consultation", area: "medico", note: "Estudios finalizados; retorna al médico" });
    })
  );
}
