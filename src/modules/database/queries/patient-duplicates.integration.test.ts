import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";
import {
  getPatientDuplicateQueue,
  mergeDuplicatePatients
} from "@/modules/database/queries/patient-duplicates";
import { createPatientRecord } from "@/modules/database/queries/patients";

async function cleanFixtures() {
  await prisma.patientDuplicateCandidate.deleteMany();
  await prisma.patientAlias.deleteMany();
  await prisma.patientMerge.deleteMany();
  await prisma.patientNote.deleteMany();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "VisitAreaTimeEvent" CASCADE');
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.internalUser.deleteMany();
}

beforeEach(cleanFixtures);
afterEach(cleanFixtures);

describe("patient duplicate merge integration", () => {
  it("moves relations, preserves the source as an alias and redirects it", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "merge-admin@test.invalid",
        passwordHash: "integration-only",
        role: "super_admin"
      }
    });
    const target = await createPatientRecord({
      fullName: "María Quispe Mamani",
      phone: "+591 7654-3210",
      birthDate: new Date("1960-03-12"),
      city: "El Alto"
    });
    const source = await createPatientRecord({
      fullName: "Mamani Maria Quispe",
      phone: "76543210",
      birthDate: new Date("1960-03-12"),
      city: "La Paz"
    });
    const visit = await prisma.visit.create({
      data: {
        patientId: source.id,
        reason: "Control registrado en ficha duplicada"
      }
    });
    await prisma.patientNote.create({
      data: {
        patientId: source.id,
        note: "Registro que debe conservarse"
      }
    });

    const [candidate] = await getPatientDuplicateQueue();
    expect(candidate).toMatchObject({
      phoneMatch: true,
      nameMatch: true,
      birthDateMatch: true,
      score: 120
    });

    const result = await mergeDuplicatePatients({
      candidateId: candidate.id,
      sourcePatientId: source.id,
      targetPatientId: target.id,
      mergedById: user.id,
      confirmation: target.internalCode
    });

    const [archivedSource, alias, movedVisit, movedNote, mergedCandidate] =
      await Promise.all([
        prisma.patient.findUniqueOrThrow({ where: { id: source.id } }),
        prisma.patientAlias.findUniqueOrThrow({
          where: { sourcePatientId: source.id }
        }),
        prisma.visit.findUniqueOrThrow({ where: { id: visit.id } }),
        prisma.patientNote.findFirstOrThrow({
          where: { note: "Registro que debe conservarse" }
        }),
        prisma.patientDuplicateCandidate.findUniqueOrThrow({
          where: { id: candidate.id }
        })
      ]);

    expect(result.targetPatientId).toBe(target.id);
    expect(archivedSource).toMatchObject({
      status: "archived",
      mergedIntoId: target.id
    });
    expect(alias).toMatchObject({
      patientId: target.id,
      sourcePatientId: source.id,
      internalCode: source.internalCode
    });
    expect(movedVisit.patientId).toBe(target.id);
    expect(movedNote.patientId).toBe(target.id);
    expect(mergedCandidate.status).toBe("merged");
    expect(await prisma.patient.count()).toBe(2);
  });
});
