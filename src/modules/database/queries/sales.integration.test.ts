import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import { createClinicalOrderRecord } from "@/modules/database/queries/clinical-care";
import { createPatientRecord, getPatientById } from "@/modules/database/queries/patients";
import {
  createPaymentRecord,
  createSaleRecord,
  getAdministrationWorkItems,
  getSaleById,
  getSalesSummary
} from "@/modules/database/queries/sales";
import { createVisitRecord } from "@/modules/database/queries/visits";

async function cleanSales() {
  await prisma.followUpStatusHistory.deleteMany();
  await prisma.followUpAttempt.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.deliveredProduct.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.nursingWorkItemResult.deleteMany();
  await prisma.nursingApplication.deleteMany();
  await prisma.nursingNote.deleteMany();
  await prisma.vitalSigns.deleteMany();
  await prisma.studyAttachment.deleteMany();
  await prisma.study.deleteMany();
  await prisma.clinicalAttachment.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

beforeEach(cleanSales);
afterEach(cleanSales);

describe("sales integration", () => {
  it("calculates totals server-side and tracks payments", async () => {
    const admin = await prisma.internalUser.create({
      data: {
        email: "admin-ventas@example.com",
        name: "Admin Ventas",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "administracion"
      }
    });
    const doctor = await prisma.internalUser.create({
      data: {
        email: "medico-ventas@example.com",
        name: "Medico Ventas",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "medico"
      }
    });
    const patient = await createPatientRecord({
      fullName: "Paciente Ventas",
      phone: "+591 70000044",
      captureSource: "whatsapp"
    });
    const visit = await createVisitRecord({
      patientId: patient.id,
      userId: admin.id,
      reason: "Administrar tratamiento"
    });

    await createClinicalOrderRecord({
      visitId: visit.id,
      doctorId: doctor.id,
      type: "administration",
      targetArea: "administracion",
      title: "Cobrar tratamiento",
      details: "Cobro de servicio indicado"
    });

    const workItem = (await getAdministrationWorkItems())[0];
    const sale = await createSaleRecord({
      patientId: patient.id,
      visitId: visit.id,
      workItemId: workItem.id,
      createdById: admin.id,
      itemType: "treatment",
      description: "Tratamiento mensual",
      quantity: 2,
      unitPriceCents: 10000,
      discountCents: 2000,
      initialPaymentCents: 5000,
      paymentMethodCode: "cash"
    });

    await createPaymentRecord({
      saleId: sale.id,
      receivedById: admin.id,
      amountCents: 13000,
      paymentMethodCode: "qr",
      reference: "QR-001"
    });

    const detail = await getSaleById(sale.id);
    const summary = await getSalesSummary();
    const patientDetail = await getPatientById(patient.id);

    expect(detail).toMatchObject({
      subtotalCents: 20000,
      discountCents: 2000,
      totalCents: 18000,
      paidCents: 18000,
      balanceCents: 0,
      status: "paid"
    });
    expect(detail?.payments).toHaveLength(2);
    expect(summary.todaySales._sum.paidCents).toBeGreaterThanOrEqual(18000);
    expect(patientDetail?.sales[0]?.id).toBe(sale.id);
  });
});
