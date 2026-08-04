import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import { createClinicalOrderRecord } from "@/modules/database/queries/clinical-care";
import {
  createNursingApplicationRecord,
  createVitalSignsRecord,
  getNursingWorkItemById,
  getNursingWorkItems,
  updateNursingWorkItemStatus
} from "@/modules/database/queries/nursing";
import { createPatientRecord, getPatientById } from "@/modules/database/queries/patients";
import { createStudyRecord, getStudiesForVisit } from "@/modules/database/queries/studies";
import { createVisitRecord, updateVisitRouteStatus } from "@/modules/database/queries/visits";
import {
  createPaidStudyOrder,
  hasPaidStudyFlowError,
  releasePaidStudiesToNursing
} from "@/modules/database/queries/paid-studies";
import {
  createServiceCatalogItemRecord,
  getActiveStudyCatalogItems
} from "@/modules/database/queries/service-catalog";

async function cleanNursingStudies() {
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
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "VisitAreaTimeEvent" CASCADE');
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
  await prisma.serviceCatalogItemVersion.deleteMany({
    where: { catalogItem: { code: { startsWith: "TEST-STUDY-" } } }
  });
  await prisma.serviceCatalogItem.deleteMany({
    where: { code: { startsWith: "TEST-STUDY-" } }
  });
}

beforeEach(cleanNursingStudies);
afterEach(cleanNursingStudies);

describe("nursing and studies integration", () => {
  it("orders an administrable study, requires payment and releases it to nursing", async () => {
    const doctor = await prisma.internalUser.create({
      data: {
        email: "medico-estudio-catalogo@example.com",
        name: "Médico Catálogo",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "medico"
      }
    });
    const patient = await createPatientRecord({
      fullName: "Paciente Estudio Administrable",
      phone: "+591 70000108",
      captureSource: "whatsapp"
    });
    const visit = await createVisitRecord({
      patientId: patient.id,
      userId: doctor.id,
      reason: "Requiere análisis"
    });
    await updateVisitRouteStatus({
      visitId: visit.id,
      userId: doctor.id,
      status: "in_consultation",
      area: "medico",
      note: "Consulta activa"
    });
    const catalogItem = await createServiceCatalogItemRecord({
      code: "TEST-STUDY-GLUCOSA",
      name: "Glucosa en sangre",
      category: "Estudios",
      kind: "study",
      basePriceCents: 7500,
      requiresNursing: true,
      ownMaxDiscountCents: 1000,
      userId: doctor.id
    });

    expect(await getActiveStudyCatalogItems()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: catalogItem.id, name: "Glucosa en sangre" })
      ])
    );

    const { sale, workItem } = await createPaidStudyOrder({
      visitId: visit.id,
      doctorId: doctor.id,
      requestedById: doctor.id,
      source: "consultation",
      discount: "5.00",
      details: "Paciente en ayunas",
      studies: [{ catalogItemId: catalogItem.id, price: "75.00", quantity: 1 }]
    });

    expect(sale).toMatchObject({
      status: "pending",
      subtotalCents: 7500,
      discountCents: 500,
      totalCents: 7000,
      balanceCents: 7000
    });
    expect(
      await prisma.clinicalOrder.findFirstOrThrow({ where: { workItemId: workItem.id } })
    ).toMatchObject({
      type: "study",
      title: "Glucosa en sangre",
      details: "Paciente en ayunas"
    });

    let unpaidError: unknown;
    try {
      await releasePaidStudiesToNursing({ workItemId: workItem.id, userId: doctor.id });
    } catch (error) {
      unpaidError = error;
    }
    expect(hasPaidStudyFlowError(unpaidError, "STUDY_PAYMENT_REQUIRED")).toBe(true);

    await prisma.sale.update({
      where: { id: sale.id },
      data: { status: "paid", paidCents: 7000, balanceCents: 0 }
    });
    const nursingWorkItem = await releasePaidStudiesToNursing({
      workItemId: workItem.id,
      userId: doctor.id
    });

    expect(nursingWorkItem).toMatchObject({
      area: "enfermeria",
      title: "Realizar estudios pagados"
    });
    expect(await prisma.visit.findUniqueOrThrow({ where: { id: visit.id } })).toMatchObject({
      status: "in_nursing"
    });
  });

  it("associates nursing execution and studies with patient and visit", async () => {
    const doctor = await prisma.internalUser.create({
      data: {
        email: "medico-v33@example.com",
        name: "Medico V33",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "medico"
      }
    });
    const nurse = await prisma.internalUser.create({
      data: {
        email: "enfermeria-v33@example.com",
        name: "Enfermeria V33",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "enfermeria"
      }
    });
    const patient = await createPatientRecord({
      fullName: "Paciente V33",
      phone: "+591 70000033",
      captureSource: "whatsapp"
    });
    const visit = await createVisitRecord({
      patientId: patient.id,
      userId: doctor.id,
      reason: "Control"
    });

    await updateVisitRouteStatus({
      visitId: visit.id,
      userId: doctor.id,
      status: "in_consultation",
      area: "medico",
      note: "Consulta activa"
    });

    const order = await createClinicalOrderRecord({
      visitId: visit.id,
      doctorId: doctor.id,
      type: "nursing_application",
      targetArea: "enfermeria",
      title: "Aplicar suero ABC",
      details: "500 ml por vía IV"
    });
    const workItem = (await getNursingWorkItems())[0];

    await updateNursingWorkItemStatus({
      workItemId: workItem.id,
      userId: nurse.id,
      status: "in_progress",
      notes: "Tarea tomada"
    });
    await createVitalSignsRecord({
      patientId: patient.id,
      visitId: visit.id,
      recordedById: nurse.id,
      systolicPressureMmHg: 110,
      diastolicPressureMmHg: 70,
      heartRateBpm: 78
    });
    await createNursingApplicationRecord({
      patientId: patient.id,
      visitId: visit.id,
      workItemId: workItem.id,
      clinicalOrderId: order.id,
      responsibleId: nurse.id,
      medication: "Suero ABC",
      quantity: "500 ml",
      route: "IV"
    });
    await createStudyRecord({
      patientId: patient.id,
      visitId: visit.id,
      workItemId: workItem.id,
      clinicalOrderId: order.id,
      recordedById: nurse.id,
      type: "resonance",
      status: "performed",
      title: "Resonancia lumbar",
      resultSummary: "Sin lesión aguda"
    });

    const detail = await getNursingWorkItemById(workItem.id);
    const studies = await getStudiesForVisit(visit.id);
    const patientDetail = await getPatientById(patient.id);

    expect(detail?.status).toBe("completed");
    expect(detail?.nursingApplications[0]).toMatchObject({
      medication: "Suero ABC",
      patientId: patient.id,
      visitId: visit.id
    });
    expect(studies[0]).toMatchObject({
      title: "Resonancia lumbar",
      patientId: patient.id,
      visitId: visit.id
    });
    expect(patientDetail?.vitalSigns[0]?.heartRateBpm).toBe(78);
    expect(patientDetail?.studies[0]?.type).toBe("resonance");
  });
});
