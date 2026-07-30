import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";
import {
  createVisitRecord,
  findClosedVisitTransitionError,
  getVisitFlowState,
  updateVisitRouteStatus
} from "@/modules/database/queries/visits";
import { createPatientRecord } from "@/modules/database/queries/patients";
import { recordVisitDiscontinuation } from "@/modules/database/queries/visit-discontinuations";

async function cleanVisitFlowData() {
  await prisma.visitDiscontinuation.deleteMany();
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

    const user = await prisma.internalUser.create({
      data: {
        email: `reception-${visit.id}@test.invalid`,
        name: "Marlen QA",
        passwordHash: "integration-only",
        role: "recepcion"
      }
    });
    await recordVisitDiscontinuation({
      visitId: visit.id,
      recordedById: user.id,
      reason: "wait",
      note: "Esperó demasiado.",
      pendingTypes: ["consultation"],
      createFollowUp: false
    });

    const trace = await getVisitTrace(visit.id);

    expect(trace.status).toBe("left_without_care");
    expect(trace.route?.active).toBe(false);
    expect(trace.route?.currentArea).toBe("recepcion");
    expect(trace.statusHistory.at(-1)).toMatchObject({
      fromStatus: "in_reception",
      toStatus: "left_without_care",
      note: "No continuará por tiempo de espera. Esperó demasiado."
    });
    expect(trace.route?.steps.at(-1)).toMatchObject({
      area: "recepcion",
      status: "left_without_care"
    });
    expect(
      await prisma.visitDiscontinuation.findUnique({
        where: { visitId: visit.id }
      })
    ).toMatchObject({
      fromStatus: "in_reception",
      area: "recepcion",
      reason: "wait",
      pendingTypes: ["consultation"]
    });
  });

  it("keeps unfinished work blocked and creates recovery only with consent", async () => {
    const visit = await createVisitInReception();
    const marlen = await prisma.internalUser.create({
      data: {
        email: `marlen-${visit.id}@test.invalid`,
        name: "Marlen Recepción",
        passwordHash: "integration-only",
        role: "recepcion"
      }
    });
    await prisma.patientConsent.create({
      data: {
        patientId: visit.patientId,
        purpose: "follow_up",
        decision: "granted",
        contactChannels: ["whatsapp"],
        captureMethod: "in_person_verbal",
        textVersion: "integration",
        textSnapshot: "Consentimiento de integración.",
        recordedById: marlen.id
      }
    });
    await updateVisitRouteStatus({
      visitId: visit.id,
      userId: marlen.id,
      status: "in_nursing",
      area: "enfermeria",
      note: "Pasa a enfermería"
    });
    await prisma.clinicalOrder.create({
      data: {
        visitId: visit.id,
        patientId: visit.patientId,
        doctorId: marlen.id,
        type: "serum",
        targetArea: "enfermeria",
        title: "Aplicar suero"
      }
    });

    const result = await recordVisitDiscontinuation({
      visitId: visit.id,
      recordedById: marlen.id,
      reason: "missing_supply",
      pendingTypes: [],
      createFollowUp: true
    });

    expect(result.followUpCreated).toBe(true);
    expect(result.discontinuation.pendingTypes).toEqual([
      "application",
      "follow_up"
    ]);
    expect(
      await prisma.visitWorkItem.count({
        where: { visitId: visit.id, status: "blocked" }
      })
    ).toBeGreaterThan(0);
    expect(
      await prisma.clinicalOrder.findFirstOrThrow({
        where: { visitId: visit.id }
      })
    ).toMatchObject({ status: "blocked" });
    expect(
      await prisma.followUpTask.findUniqueOrThrow({
        where: { id: result.discontinuation.followUpTaskId! }
      })
    ).toMatchObject({
      type: "treatment_recovery",
      domain: "clinical",
      priority: "high",
      assignedToId: marlen.id
    });
  });

  it("exposes the flow state used to guard closed visits", async () => {
    const visit = await createVisitInReception();

    const user = await prisma.internalUser.create({
      data: {
        email: `closed-${visit.id}@test.invalid`,
        passwordHash: "integration-only",
        role: "recepcion"
      }
    });
    await recordVisitDiscontinuation({
      visitId: visit.id,
      recordedById: user.id,
      reason: "other",
      pendingTypes: [],
      createFollowUp: false
    });

    const state = await getVisitFlowState(visit.id);

    expect(state?.status).toBe("left_without_care");
    expect(state?.route?.currentArea).toBe("recepcion");
  });

  it("prevents reopening a visit after it is closed", async () => {
    const visit = await createVisitInReception();

    const user = await prisma.internalUser.create({
      data: {
        email: `guard-${visit.id}@test.invalid`,
        passwordHash: "integration-only",
        role: "recepcion"
      }
    });
    await recordVisitDiscontinuation({
      visitId: visit.id,
      recordedById: user.id,
      reason: "other",
      pendingTypes: [],
      createFollowUp: false
    });

    let failure: unknown;
    try {
      await updateVisitRouteStatus({
        visitId: visit.id,
        status: "in_consultation",
        area: "medico"
      });
    } catch (error) {
      failure = error;
    }

    expect(findClosedVisitTransitionError(failure)).toMatchObject({ visitId: visit.id });
    expect((await getVisitFlowState(visit.id))?.status).toBe("left_without_care");
  });
});
