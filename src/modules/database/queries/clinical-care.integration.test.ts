import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import { createPatientRecord } from "@/modules/database/queries/patients";
import {
  createVisitRecord,
  findDraftClinicalConsultationError,
  updateVisitRouteStatus
} from "@/modules/database/queries/visits";
import {
  createClinicalOrderRecord,
  getClinicalVisitById,
  getConsultationVisits,
  upsertClinicalConsultationRecord
} from "@/modules/database/queries/clinical-care";
import {
  correctClinicalConsultation,
  finalizeClinicalConsultation
} from "@/modules/database/queries/clinical-records";

async function cleanClinicalCare() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "PurchaseDocument", "InventoryLotAdjustment", "PurchaseReceiptLine", "InventoryMovement", "InventoryAdjustment", "InventoryLot", "PurchaseReceipt", "PurchasePayment", "PurchaseLine", "Purchase" CASCADE'
  );
  await prisma.inventoryAlert.deleteMany();
  await prisma.followUpStatusHistory.deleteMany();
  await prisma.followUpAttempt.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.deliveredProduct.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "InventoryItemCatalogVersion", "SupplierVersion", "InventoryItemSupplier", "InventoryItem", "Supplier" CASCADE'
  );
  await prisma.nursingWorkItemResult.deleteMany();
  await prisma.nursingApplication.deleteMany();
  await prisma.nursingNote.deleteMany();
  await prisma.vitalSigns.deleteMany();
  await prisma.clinicalAttachmentAccessGrant.deleteMany();
  await prisma.clinicalAttachment.deleteMany();
  await prisma.study.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

beforeEach(cleanClinicalCare);
afterEach(cleanClinicalCare);

describe("clinical care integration", () => {
  it("records consultation, diagnosis, prescription, evolution and clinical order", async () => {
    const doctor = await prisma.internalUser.create({
      data: {
        email: "medico@example.com",
        name: "Medico Test",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "medico"
      }
    });

    const patient = await createPatientRecord({
      fullName: "Paciente Clinico",
      phone: "+591 70000006",
      captureSource: "whatsapp"
    });

    const visit = await createVisitRecord({
      patientId: patient.id,
      userId: doctor.id,
      reason: "Dolor general"
    });

    await updateVisitRouteStatus({
      visitId: visit.id,
      userId: doctor.id,
      status: "in_consultation",
      area: "medico",
      note: "Paciente en consulta"
    });

    await upsertClinicalConsultationRecord({
      visitId: visit.id,
      doctorId: doctor.id,
      expectedRevision: 0,
      motive: "Dolor general",
      primaryDiagnosis: "Diagnostico principal",
      secondaryDiagnosis: "Diagnostico secundario",
      treatmentPlanText: "Plan de tratamiento",
      indications: "Indicaciones generales",
      prescriptionMedication: "Suero ABC",
      prescriptionDose: "1 unidad",
      prescriptionFrequency: "Una vez",
      prescriptionDuration: "Hoy",
      evolutionNote: "Paciente estable"
    });

    await createClinicalOrderRecord({
      visitId: visit.id,
      doctorId: doctor.id,
      type: "serum",
      targetArea: "enfermeria",
      title: "Aplicar suero ABC",
      details: "Aplicar en sala de enfermeria."
    });

    const consultationVisits = await getConsultationVisits();
    const detail = await getClinicalVisitById(visit.id);

    expect(consultationVisits).toHaveLength(1);
    expect(detail?.clinicalConsultation?.diagnoses).toHaveLength(2);
    expect(detail?.clinicalConsultation).toMatchObject({
      status: "draft",
      revision: 1
    });
    expect(detail?.clinicalConsultation?.versions).toHaveLength(1);
    expect(detail?.prescriptions[0]?.items[0]?.medication).toBe("Suero ABC");
    expect(detail?.clinicalEvolutions[0]?.note).toBe("Paciente estable");
    expect(detail?.clinicalOrders[0]).toMatchObject({
      title: "Aplicar suero ABC",
      targetArea: "enfermeria",
      status: "pending"
    });
    expect(detail?.workItems.some((item) => item.title === "Aplicar suero ABC")).toBe(true);
  });

  it("finalizes and corrects without changing related sales, orders or applications", async () => {
    const doctor = await prisma.internalUser.create({
      data: {
        email: "firma@example.com",
        name: "Médico Firma",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "medico"
      }
    });
    const patient = await createPatientRecord({
      fullName: "Paciente Versionado",
      phone: "+591 70000016",
      captureSource: "whatsapp"
    });
    const visit = await createVisitRecord({
      patientId: patient.id,
      userId: doctor.id,
      reason: "Dolor abdominal"
    });
    const consultation = await upsertClinicalConsultationRecord({
      visitId: visit.id,
      doctorId: doctor.id,
      expectedRevision: 0,
      motive: "Dolor abdominal",
      primaryDiagnosis: "Gastritis",
      findings: "Dolor a la palpación",
      treatmentPlanText: "Plan inicial",
      indications: "Control en siete días"
    });
    const order = await createClinicalOrderRecord({
      visitId: visit.id,
      doctorId: doctor.id,
      type: "serum",
      targetArea: "enfermeria",
      title: "Aplicar suero",
      details: "Orden original"
    });
    const application = await prisma.nursingApplication.create({
      data: {
        patientId: patient.id,
        visitId: visit.id,
        responsibleId: doctor.id,
        medication: "Suero aplicado",
        quantity: "1"
      }
    });
    const sale = await prisma.sale.create({
      data: {
        patientId: patient.id,
        visitId: visit.id,
        createdById: doctor.id,
        status: "paid",
        subtotalCents: 10000,
        totalCents: 10000,
        paidCents: 10000,
        balanceCents: 0,
        notes: "Venta original"
      }
    });

    let draftCloseError: unknown;
    try {
      await updateVisitRouteStatus({
        visitId: visit.id,
        userId: doctor.id,
        status: "completed",
        area: "cierre",
        note: "Intento de cierre con borrador"
      });
    } catch (error) {
      draftCloseError = error;
    }
    expect(findDraftClinicalConsultationError(draftCloseError)).not.toBeNull();

    const finalized = await finalizeClinicalConsultation({
      visitId: visit.id,
      consultationId: consultation.id,
      expectedRevision: 1,
      finalizedById: doctor.id
    });
    expect(finalized).toMatchObject({
      status: "finalized",
      revision: 2,
      finalizedById: doctor.id
    });
    expect(finalized.finalizedAt).toBeInstanceOf(Date);

    const corrected = await correctClinicalConsultation({
      visitId: visit.id,
      consultationId: consultation.id,
      expectedRevision: 2,
      correctedById: doctor.id,
      correctionType: "diagnosis",
      correctionReason: "Se digitó de forma incompleta el diagnóstico.",
      motive: "Dolor abdominal",
      primaryDiagnosis: "Gastritis aguda",
      findings: "Dolor a la palpación",
      treatmentPlanText: "Plan inicial",
      indications: "Control en siete días"
    });

    expect(corrected.changedFields).toEqual(["primaryDiagnosis"]);
    expect(corrected.relatedRecords).toEqual({
      sales: 1,
      applications: 1,
      orders: 1
    });
    const versions = await prisma.clinicalConsultationVersion.findMany({
      where: { consultationId: consultation.id },
      orderBy: { version: "asc" }
    });
    expect(versions).toHaveLength(3);
    expect(versions[0]).toMatchObject({
      version: 1,
      kind: "draft",
      primaryDiagnosis: "Gastritis"
    });
    expect(versions[1]).toMatchObject({
      version: 2,
      kind: "finalized",
      primaryDiagnosis: "Gastritis"
    });
    expect(versions[2]).toMatchObject({
      version: 3,
      kind: "correction",
      primaryDiagnosis: "Gastritis aguda"
    });
    expect(
      await prisma.sale.findUniqueOrThrow({ where: { id: sale.id } })
    ).toMatchObject({ notes: "Venta original", totalCents: 10000 });
    expect(
      await prisma.nursingApplication.findUniqueOrThrow({
        where: { id: application.id }
      })
    ).toMatchObject({ medication: "Suero aplicado", quantity: "1" });
    expect(
      await prisma.clinicalOrder.findUniqueOrThrow({ where: { id: order.id } })
    ).toMatchObject({ title: "Aplicar suero", details: "Orden original" });
  });

  it("accepts only one correction when two tabs use the same revision", async () => {
    const doctor = await prisma.internalUser.create({
      data: {
        email: "concurrencia@example.com",
        name: "Médico Concurrencia",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "medico"
      }
    });
    const patient = await createPatientRecord({
      fullName: "Paciente Concurrente",
      phone: "+591 70000026",
      captureSource: "whatsapp"
    });
    const visit = await createVisitRecord({
      patientId: patient.id,
      userId: doctor.id,
      reason: "Control"
    });
    const consultation = await upsertClinicalConsultationRecord({
      visitId: visit.id,
      doctorId: doctor.id,
      expectedRevision: 0,
      motive: "Control médico",
      primaryDiagnosis: "Diagnóstico inicial"
    });
    await finalizeClinicalConsultation({
      visitId: visit.id,
      consultationId: consultation.id,
      expectedRevision: 1,
      finalizedById: doctor.id
    });

    const baseCorrection = {
      visitId: visit.id,
      consultationId: consultation.id,
      expectedRevision: 2,
      correctedById: doctor.id,
      correctionType: "diagnosis" as const,
      correctionReason: "Corrección concurrente de diagnóstico.",
      motive: "Control médico"
    };
    const results = await Promise.allSettled([
      correctClinicalConsultation({
        ...baseCorrection,
        primaryDiagnosis: "Diagnóstico desde pestaña A"
      }),
      correctClinicalConsultation({
        ...baseCorrection,
        primaryDiagnosis: "Diagnóstico desde pestaña B"
      })
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(
      await prisma.clinicalConsultationVersion.count({
        where: { consultationId: consultation.id, kind: "correction" }
      })
    ).toBe(1);
    expect(
      await prisma.clinicalConsultation.findUniqueOrThrow({
        where: { id: consultation.id }
      })
    ).toMatchObject({ revision: 3, status: "finalized" });
  });
});
