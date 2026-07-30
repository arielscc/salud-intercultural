import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import {
  getAreaTimeReport,
  recordAreaTimeTransition
} from "@/modules/database/queries/area-times";
import { createPatientRecord } from "@/modules/database/queries/patients";
import {
  createVisitRecord,
  updateVisitRouteStatus
} from "@/modules/database/queries/visits";

async function cleanAreaTimes() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "VisitAreaTimeEvent", "VisitDiscontinuation", "VisitWorkItem", "VisitStatusHistory", "ReceptionCheckIn", "PatientRouteStep", "PatientRoute", "Visit", "Patient", "InternalSession", "InternalUser" CASCADE'
  );
}

beforeEach(cleanAreaTimes);
afterEach(cleanAreaTimes);

describe("area time events integration", () => {
  it("records phase changes and route boundaries without editing history", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "reception-area-times@test.invalid",
        name: "Recepción QA",
        passwordHash: await hashPassword("clave-segura-area-times-123"),
        role: "recepcion"
      }
    });
    const patient = await createPatientRecord({
      fullName: "Paciente de tiempos",
      phone: "70000009"
    });
    const visit = await createVisitRecord({
      patientId: patient.id,
      userId: user.id,
      reason: "Medición de atención"
    });

    await recordAreaTimeTransition({
      data: { visitId: visit.id, action: "start_attention" },
      userId: user.id,
      userRole: user.role
    });
    await recordAreaTimeTransition({
      data: {
        visitId: visit.id,
        action: "block",
        reason: "Espera de documento"
      },
      userId: user.id,
      userRole: user.role
    });
    await recordAreaTimeTransition({
      data: { visitId: visit.id, action: "resume" },
      userId: user.id,
      userRole: user.role
    });
    await updateVisitRouteStatus({
      visitId: visit.id,
      userId: user.id,
      status: "in_consultation",
      area: "medico"
    });

    const events = await prisma.visitAreaTimeEvent.findMany({
      where: { visitId: visit.id },
      orderBy: [{ routeStepId: "asc" }, { sequence: "asc" }]
    });
    const receptionEvents = events.filter((event) => event.area === "recepcion");
    expect(receptionEvents.map((event) => event.type)).toEqual([
      "entered",
      "attention_started",
      "blocked",
      "resumed_attention",
      "exited"
    ]);
    expect(events.some((event) => event.area === "medico" && event.type === "entered")).toBe(true);

    const report = await getAreaTimeReport({
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 60_000),
      area: "recepcion",
      branchCode: "el-alto"
    });
    expect(report.totals.sessions).toBe(1);
    expect(report.sessions[0]).toMatchObject({
      area: "recepcion",
      inferred: false,
      invalidSequence: false
    });

    await expect(
      prisma.visitAreaTimeEvent.update({
        where: { id: events[0].id },
        data: { reason: "No debe cambiar" }
      })
    ).rejects.toThrow();
  });
});
