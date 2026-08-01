import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import { createPatientRecord, getPatientById, getPatients } from "@/modules/database/queries/patients";
import { createVisitRecord, getVisitById, getVisits, updateVisitRouteStatus } from "@/modules/database/queries/visits";

async function cleanPatientsVisits() {
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

beforeEach(cleanPatientsVisits);
afterEach(cleanPatientsVisits);

describe("patients and visits integration", () => {
  it("creates a patient, opens a visit and updates the active route", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "recepcion@example.com",
        name: "Recepcion Test",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "recepcion"
      }
    });

    const patient = await createPatientRecord({
      fullName: "Paciente Recepcion",
      phone: "+591 70000005",
      city: "El Alto",
      captureSource: "whatsapp",
      createdById: user.id
    });

    const visit = await createVisitRecord({
      idempotencyKey: "visit-mobile-retry",
      patientId: patient.id,
      userId: user.id,
      reason: "Primera consulta",
      note: "Llego sin cita"
    });
    const retriedVisit = await createVisitRecord({
      idempotencyKey: "visit-mobile-retry",
      patientId: patient.id,
      userId: user.id,
      reason: "Primera consulta",
      note: "Llego sin cita"
    });

    await updateVisitRouteStatus({
      visitId: visit.id,
      userId: user.id,
      status: "in_consultation",
      area: "medico",
      note: "Derivado al médico"
    });

    const patients = await getPatients({ search: "Recepcion" });
    const visits = await getVisits({ activeOnly: true });
    const detail = await getPatientById(patient.id);
    const visitDetail = await getVisitById(visit.id);

    expect(patients).toHaveLength(1);
    expect(retriedVisit.id).toBe(visit.id);
    expect(visits).toHaveLength(1);
    expect(detail?.visits).toHaveLength(1);
    expect(visitDetail?.status).toBe("in_consultation");
    expect(visitDetail?.route?.currentArea).toBe("medico");
    expect(visitDetail?.route?.steps).toHaveLength(2);
    expect(visitDetail?.workItems.length).toBeGreaterThanOrEqual(2);
  });
});
