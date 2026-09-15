import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import {
  configureClinicalProfessionalProfile,
  correctPrescription,
  generateInternalReceiptDocument,
  generatePrescriptionDocument,
  getGeneratedDocument
} from "@/modules/generated-documents/service";

async function cleanDocuments() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "GeneratedDocument", "ClinicalProfessionalProfile", "PrescriptionItem", "Prescription", "ClinicalConsultationVersion", "Diagnosis", "TreatmentPlan", "ClinicalConsultation", "SaleItem", "Payment", "Sale", "Visit", "Patient", "InternalSession", "InternalUser" CASCADE'
  );
}

beforeEach(cleanDocuments);
afterEach(cleanDocuments);

async function setup() {
  const passwordHash = await hashPassword("clave-segura-documentos-123");
  const [doctor, administrator, direction] = await Promise.all([
    prisma.internalUser.create({
      data: {
        email: `medico-${randomUUID()}@example.com`,
        name: "Médico de prueba",
        passwordHash,
        branchAssignments: {
          create: { branchCode: "el-alto", role: "medico", active: true, isDefault: true }
        }
      }
    }),
    prisma.internalUser.create({
      data: {
        email: `administracion-${randomUUID()}@example.com`,
        name: "Administración",
        passwordHash,
        branchAssignments: {
          create: { branchCode: "el-alto", role: "administracion", active: true, isDefault: true }
        }
      }
    }),
    prisma.internalUser.create({
      data: {
        email: `direccion-${randomUUID()}@example.com`,
        name: "Dirección",
        passwordHash,
        branchAssignments: {
          create: { branchCode: "el-alto", role: "direccion", active: true, isDefault: true }
        }
      }
    })
  ]);
  await configureClinicalProfessionalProfile({
    branchCode: "el-alto",
    userId: doctor.id,
    configuredById: direction.id,
    displayName: "Médico de prueba",
    professionalTitle: "Dr.",
    specialty: "Medicina natural",
    ministryRegistration: "MS-TEST",
    medicalCollegeRegistration: "CM-TEST",
    active: true
  });
  const patient = await prisma.patient.create({
    data: {
      internalCode: `P-${randomUUID().slice(0, 8)}`,
      fullName: "Paciente de prueba",
      phone: "70000000",
      branchRecords: {
        create: { branchCode: "el-alto", recordNumber: `el-alto-${randomUUID()}` }
      }
    }
  });
  const visit = await prisma.visit.create({
    data: {
      patientId: patient.id,
      branchCode: "el-alto",
      patientNameSnapshot: patient.fullName,
      patientPhoneSnapshot: patient.phone,
      status: "in_consultation"
    }
  });
  await prisma.clinicalConsultation.create({
    data: {
      branchCode: "el-alto",
      visitId: visit.id,
      patientId: patient.id,
      doctorId: doctor.id,
      finalizedById: doctor.id,
      finalizedAt: new Date(),
      status: "finalized",
      motive: "Consulta de prueba"
    }
  });
  await prisma.prescription.create({
    data: {
      branchCode: "el-alto",
      visitId: visit.id,
      patientId: patient.id,
      doctorId: doctor.id,
      items: {
        create: {
          medication: "Tratamiento inicial",
          dose: "Una medida"
        }
      }
    }
  });
  const sale = await prisma.sale.create({
    data: {
      patientId: patient.id,
      visitId: visit.id,
      branchCode: "el-alto",
      createdById: administrator.id,
      subtotalCents: 2000,
      totalCents: 2000,
      balanceCents: 2000,
      items: {
        create: {
          type: "treatment",
          description: "Tratamiento inicial",
          quantity: 1,
          unitPriceCents: 2000,
          totalCents: 2000
        }
      }
    }
  });
  return { doctor, administrator, patient, visit, sale };
}

describe("versioned generated documents integration", () => {
  it("reuses the same source and creates a new prescription version after correction", async () => {
    const fixture = await setup();
    const first = await generatePrescriptionDocument({
      branchCode: "el-alto",
      visitId: fixture.visit.id,
      generatedById: fixture.doctor.id
    });
    expect(await getGeneratedDocument(first.id, "cochabamba")).toBeNull();
    const reprintSource = await generatePrescriptionDocument({
      branchCode: "el-alto",
      visitId: fixture.visit.id,
      generatedById: fixture.doctor.id
    });
    expect(reprintSource.id).toBe(first.id);

    await correctPrescription({
      branchCode: "el-alto",
      visitId: fixture.visit.id,
      doctorId: fixture.doctor.id,
      reason: "Se agregó un medicamento a la receta",
      items: [
        {
          medication: "Tratamiento adicional",
          dose: "Una medida",
          frequency: "Cada 12 horas"
        }
      ]
    });
    const second = await generatePrescriptionDocument({
      branchCode: "el-alto",
      visitId: fixture.visit.id,
      generatedById: fixture.doctor.id
    });
    expect(second.version).toBe(2);
    expect(second.supersedesId).toBe(first.id);

    await expect(
      prisma.generatedDocument.update({
        where: { id: first.id },
        data: { version: 99 }
      })
    ).rejects.toThrow(/append-only/i);
    await expect(
      prisma.generatedDocument.delete({ where: { id: first.id } })
    ).rejects.toThrow(/append-only/i);
  });

  it("creates another receipt version only after source payments change", async () => {
    const fixture = await setup();
    const first = await generateInternalReceiptDocument({
      saleId: fixture.sale.id,
      branchCode: "el-alto",
      generatedById: fixture.administrator.id
    });
    expect(
      (
        await generateInternalReceiptDocument({
          saleId: fixture.sale.id,
          branchCode: "el-alto",
          generatedById: fixture.administrator.id
        })
      ).id
    ).toBe(first.id);

    const method = await prisma.paymentMethod.create({
      data: {
        code: `cash-${randomUUID()}`,
        name: "Efectivo",
        branchConfigurations: {
          create: { branchCode: "el-alto", active: true }
        }
      }
    });
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          saleId: fixture.sale.id,
          patientId: fixture.patient.id,
          visitId: fixture.visit.id,
          branchCode: "el-alto",
          methodId: method.id,
          receivedById: fixture.administrator.id,
          amountCents: 500
        }
      }),
      prisma.sale.update({
        where: { id: fixture.sale.id },
        data: {
          status: "partial",
          paidCents: 500,
          balanceCents: 1500
        }
      })
    ]);
    const second = await generateInternalReceiptDocument({
      saleId: fixture.sale.id,
      branchCode: "el-alto",
      generatedById: fixture.administrator.id
    });
    expect(second.version).toBe(2);
    expect(second.supersedesId).toBe(first.id);
  });
});
