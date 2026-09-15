import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";
import { runWithDatabaseRlsContext } from "@/modules/database/rls-context";
import {
  createClinicalContinuityAccess,
  getClinicalVisitById,
  getPatientConsultationHistory,
  upsertClinicalConsultationRecord
} from "./clinical-care";

// Datos sintéticos aislados; ejecución reservada al cierre acumulado del plan.
const suffix = randomUUID();
const local = `t8-local-${suffix}`;
const remote = `t8-remote-${suffix}`;
const doctorId = `t8-doctor-${suffix}`;
const adminId = `t8-admin-${suffix}`;
const patientId = `t8-patient-${suffix}`;
const localVisitId = `t8-visit-local-${suffix}`;
const remoteVisitId = `t8-visit-remote-${suffix}`;

beforeAll(async () => {
  await prisma.clinicBranch.createMany({
    data: [local, remote].map((code) => ({ code, name: code, city: "Prueba", department: "Prueba", status: "active" }))
  });
  for (const [id, role] of [[doctorId, "medico"], [adminId, "administracion"]] as const) {
    await prisma.internalUser.create({
      data: {
        id, email: `${id}@example.invalid`, passwordHash: "synthetic-unusable-hash",
        branchAssignments: { create: { branchCode: local, role, active: true, isDefault: true } }
      }
    });
  }
  await prisma.patient.create({
    data: {
      id: patientId, internalCode: patientId, fullName: "Paciente sintético T8", phone: "00000000",
      branchRecords: { create: [local, remote].map((branchCode) => ({ branchCode, recordNumber: `${branchCode}-1` })) }
    }
  });
  for (const [id, branchCode] of [[localVisitId, local], [remoteVisitId, remote]]) {
    await prisma.visit.create({
      data: { id, branchCode, patientId, patientNameSnapshot: "Paciente sintético T8", patientPhoneSnapshot: "00000000", status: "in_consultation", isTestData: true }
    });
  }
  await prisma.clinicalConsultation.create({
    data: { visitId: remoteVisitId, patientId, branchCode: remote, motive: "Antecedente sintético remoto" }
  });
  await prisma.patientConsent.create({
    data: { patientId, branchCode: local, purpose: "clinical_continuity", decision: "granted", captureMethod: "written_form", textVersion: "test", textSnapshot: "Consentimiento sintético" }
  });
});

afterAll(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Patient" CASCADE');
  await prisma.internalUserBranch.deleteMany({ where: { userId: { in: [doctorId, adminId] } } });
  await prisma.internalUser.deleteMany({ where: { id: { in: [doctorId, adminId] } } });
  await prisma.clinicBranch.deleteMany({ where: { code: { in: [local, remote] } } });
});

describe("Tarea 8: expediente local y continuidad médica", () => {
  it("rechaza lectura operativa, escritura e inserción con visita de otra sede", async () => {
    expect(await getClinicalVisitById(remoteVisitId, local)).toBeNull();
    await expect(upsertClinicalConsultationRecord({
      visitId: remoteVisitId, branchCode: local, doctorId, expectedRevision: 1,
      motive: "Intento remoto", primaryDiagnosis: "No guardar"
    })).rejects.toThrow();
    await expect(prisma.clinicalOrder.create({
      data: { visitId: remoteVisitId, patientId, branchCode: local, type: "administration", targetArea: "administracion", title: "Cruce rechazado" }
    })).rejects.toMatchObject({ code: "P2003" });
    expect((await prisma.clinicalConsultation.findUniqueOrThrow({ where: { visitId: remoteVisitId } })).motive).toBe("Antecedente sintético remoto");
  });

  it("limita la continuidad al médico, al paciente y a la sede del acceso registrado", async () => {
    const input = { patientId, excludeVisitId: localVisitId, branchCode: local };
    expect((await runWithDatabaseRlsContext({
      branchCode: local, userId: doctorId, effectiveRole: "medico", accessMode: "work"
    }, () => getPatientConsultationHistory(input))).visits).toHaveLength(0);
    const request = { patientId, visitId: localVisitId, branchCode: local, reason: "Revisar tratamiento previo del paciente" };
    await expect(runWithDatabaseRlsContext({
      branchCode: local, userId: adminId, effectiveRole: "administracion", accessMode: "work"
    }, () => createClinicalContinuityAccess({ ...request, doctorId: adminId }))).rejects.toThrow();
    const access = await runWithDatabaseRlsContext({
      branchCode: local, userId: doctorId, effectiveRole: "medico", accessMode: "work"
    }, () => createClinicalContinuityAccess({ ...request, doctorId }));
    expect(access.consultedBranchCodes).toEqual([remote]);
    expect(access.reason).toBe(request.reason);
    const history = await runWithDatabaseRlsContext({
      branchCode: local, userId: doctorId, effectiveRole: "medico", accessMode: "work"
    }, () => getPatientConsultationHistory({ ...input, doctorId, continuityAccessId: access.id }));
    expect(history.crossBranch).toBe(true);
    expect(history.visits.map((visit) => visit.branch.code)).toEqual([remote]);
    expect((await runWithDatabaseRlsContext({
      branchCode: local, userId: adminId, effectiveRole: "administracion", accessMode: "work"
    }, () => getPatientConsultationHistory({ ...input, doctorId: adminId, continuityAccessId: access.id }))).crossBranch).toBe(false);
    await prisma.internalUserBranch.update({
      where: { userId_branchCode: { userId: doctorId, branchCode: local } }, data: { active: false }
    });
    expect((await runWithDatabaseRlsContext({
      branchCode: local, userId: doctorId, effectiveRole: "medico", accessMode: "work"
    }, () => getPatientConsultationHistory({ ...input, doctorId, continuityAccessId: access.id }))).crossBranch).toBe(false);
  });
});
