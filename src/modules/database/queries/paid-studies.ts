import type { Prisma } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import type { PaidStudyOrderInput } from "@/features/clinical-care/schemas/paid-study.schema";

const studyCatalog = [
  { key: "hemogram", priceKey: "hemogramPrice", title: "Hemograma" },
  {
    key: "hemogramResonance",
    priceKey: "hemogramResonancePrice",
    title: "Hemograma + resonancia"
  },
  { key: "resonance", priceKey: "resonancePrice", title: "Resonancia" },
  { key: "urine", priceKey: "urinePrice", title: "Análisis de orina" }
] as const;

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
    await tx.patientRouteStep.updateMany({ where: { routeId: visit.route.id, endedAt: null }, data: { endedAt: now } });
    await tx.patientRoute.update({ where: { id: visit.route.id }, data: { currentArea: input.area, active: true } });
    await tx.patientRouteStep.create({ data: { routeId: visit.route.id, area: input.area, status: input.status, note: input.note } });
  }
}

export async function createPaidStudyOrder(input: PaidStudyOrderInput & { doctorId?: string }) {
  return withDatabaseError("createPaidStudyOrder", () =>
    prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUniqueOrThrow({ where: { id: input.visitId }, include: { patient: true } });
      const studies = studyCatalog
        .filter((study) => input[study.key])
        .map((study) => ({
          title: study.title,
          unitPriceCents: toCents(input[study.priceKey] ?? "0")
        }));
      const subtotalCents = studies.reduce((total, study) => total + study.unitPriceCents, 0);
      const discountCents = Math.min(toCents(input.discount), subtotalCents);
      const totalCents = subtotalCents - discountCents;
      const description = studies.map((study) => study.title).join(", ");

      const workItem = await tx.visitWorkItem.create({
        data: { visitId: visit.id, createdById: input.doctorId, area: "administracion", title: "Cobro de estudios", description }
      });
      await tx.clinicalOrder.createMany({
        data: studies.map((study) => ({
          visitId: visit.id,
          patientId: visit.patientId,
          doctorId: input.doctorId,
          workItemId: workItem.id,
          type: "study",
          targetArea: "enfermeria",
          title: study.title,
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
          notes: "Orden de cobro generada desde consulta médica",
          items: { create: studies.map((study) => ({ type: "study", description: study.title, quantity: 1, unitPriceCents: study.unitPriceCents, totalCents: study.unitPriceCents })) }
        }
      });
      await moveVisit(tx, { visitId: visit.id, userId: input.doctorId, status: "in_administration", area: "administracion", note: `Pendiente de pago: ${description}` });
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
      const orders = billing.clinicalOrders.filter((order) => order.type === "study");
      if (orders.length === 0) throw new Error("STUDY_ORDERS_REQUIRED");
      const nursing = await tx.visitWorkItem.create({
        data: {
          visitId: billing.visitId,
          createdById: input.userId,
          area: "enfermeria",
          title: "Realizar estudios pagados",
          description: orders.map((order) => order.title).join(", ")
        }
      });
      await tx.clinicalOrder.updateMany({ where: { id: { in: orders.map((order) => order.id) } }, data: { workItemId: nursing.id } });
      await tx.visitWorkItem.update({ where: { id: billing.id }, data: { status: "completed", completedAt: new Date() } });
      await moveVisit(tx, { visitId: billing.visitId, userId: input.userId, status: "in_nursing", area: "enfermeria", note: "Pago confirmado; enviado a enfermería" });
      return nursing;
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
