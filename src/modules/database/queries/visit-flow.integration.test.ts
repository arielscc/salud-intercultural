import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";
import {
  createVisitRecord,
  getVisitFlowState,
  updateVisitRouteStatus
} from "@/modules/database/queries/visits";
import { createPatientRecord } from "@/modules/database/queries/patients";

async function cleanVisitFlowData() {
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
}

beforeEach(cleanVisitFlowData);
afterEach(cleanVisitFlowData);

async function createVisitInReception() {
  const patient = await createPatientRecord({
    fullName: "Paciente Flujo Flexible",
    phone: "70000001"
  });

  return createVisitRecord({ patientId: patient.id, reason: "Dolor de cabeza" });
}

async function getVisitTrace(visitId: string) {
  return prisma.visit.findUniqueOrThrow({
    where: { id: visitId },
    include: {
      route: { include: { steps: { orderBy: { startedAt: "asc" } } } },
      statusHistory: { orderBy: { createdAt: "asc" } }
    }
  });
}

describe("flexible visit flow integration", () => {
  it("traces consulta -> administracion -> salida in the status history", async () => {
    const visit = await createVisitInReception();

    await updateVisitRouteStatus({
      visitId: visit.id,
      status: "in_consultation",
      area: "medico",
      note: "Pasa al médico"
    });
    await updateVisitRouteStatus({
      visitId: visit.id,
      status: "in_administration",
      area: "administracion",
      note: "Pasa a administración tras la consulta"
    });
    await updateVisitRouteStatus({
      visitId: visit.id,
      status: "completed",
      area: "cierre",
      note: "Visita cerrada desde administración"
    });

    const trace = await getVisitTrace(visit.id);

    expect(trace.status).toBe("completed");
    expect(trace.completedAt).not.toBeNull();
    expect(trace.route?.active).toBe(false);
    expect(trace.statusHistory.map((entry) => entry.toStatus)).toEqual([
      "in_reception",
      "in_consultation",
      "in_administration",
      "completed"
    ]);
    expect(trace.statusHistory.at(-1)?.fromStatus).toBe("in_administration");
  });

  it("traces consulta -> salida directa without nursing or administration", async () => {
    const visit = await createVisitInReception();

    await updateVisitRouteStatus({
      visitId: visit.id,
      status: "in_consultation",
      area: "medico"
    });
    await updateVisitRouteStatus({
      visitId: visit.id,
      status: "completed",
      area: "cierre",
      note: "Salida directa después de la consulta"
    });

    const trace = await getVisitTrace(visit.id);

    expect(trace.status).toBe("completed");
    expect(trace.route?.active).toBe(false);
    expect(trace.statusHistory.map((entry) => entry.toStatus)).toEqual([
      "in_reception",
      "in_consultation",
      "completed"
    ]);
    const openSteps = trace.route?.steps.filter((step) => step.endedAt === null) ?? [];
    expect(openSteps.map((step) => step.area)).toEqual(["cierre"]);
  });

  it("records where the patient left when abandoning in reception", async () => {
    const visit = await createVisitInReception();

    await updateVisitRouteStatus({
      visitId: visit.id,
      status: "left_without_care",
      area: "recepcion",
      note: "Se retiró en recepción"
    });

    const trace = await getVisitTrace(visit.id);

    expect(trace.status).toBe("left_without_care");
    expect(trace.route?.active).toBe(false);
    expect(trace.route?.currentArea).toBe("recepcion");
    expect(trace.statusHistory.at(-1)).toMatchObject({
      fromStatus: "in_reception",
      toStatus: "left_without_care",
      note: "Se retiró en recepción"
    });
    expect(trace.route?.steps.at(-1)).toMatchObject({
      area: "recepcion",
      status: "left_without_care"
    });
  });

  it("exposes the flow state used to guard closed visits", async () => {
    const visit = await createVisitInReception();

    await updateVisitRouteStatus({
      visitId: visit.id,
      status: "left_without_care",
      area: "recepcion"
    });

    const state = await getVisitFlowState(visit.id);

    expect(state?.status).toBe("left_without_care");
    expect(state?.route?.currentArea).toBe("recepcion");
  });
});
