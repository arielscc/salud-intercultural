import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import { runWithDatabaseRlsContext } from "@/modules/database/rls-context";
import { createClinicalOrderRecord } from "@/modules/database/queries/clinical-care";
import { appendPatientConsentRecord } from "@/modules/database/queries/patient-consents";
import {
  assignNursingWorkItem,
  createNursingApplicationRecord,
  createNursingContinuityAccess,
  createNursingNoteRecord,
  createVitalSignsRecord,
  getNursingContinuityHistory,
  getNursingWorkItemById,
  getNursingWorkItems
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
  await prisma.nursingContinuityAccess.deleteMany();
  await prisma.clinicalContinuityAccess.deleteMany();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "VisitAreaTimeEvent" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Patient" CASCADE');
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
  await prisma.serviceCatalogItemBranch.deleteMany({
    where: { catalogItem: { code: { startsWith: "TEST-STUDY-" } } }
  });
  await prisma.serviceCatalogItemVersion.deleteMany({
    where: { catalogItem: { code: { startsWith: "TEST-STUDY-" } } }
  });
  await prisma.serviceCatalogItem.deleteMany({
    where: { code: { startsWith: "TEST-STUDY-" } }
  });
}

beforeEach(async () => {
  await cleanNursingStudies();
  await prisma.clinicBranch.update({
    where: { code: "cochabamba" },
    data: { status: "active" }
  });
});
afterEach(async () => {
  await cleanNursingStudies();
  await prisma.clinicBranch.update({
    where: { code: "cochabamba" },
    data: { status: "preparation" }
  });
});

describe("nursing and studies integration", () => {
  it("orders an administrable study, requires payment and releases it to nursing", async () => {
    const doctor = await prisma.internalUser.create({
      data: {
        email: "medico-estudio-catalogo@example.com",
        name: "Médico Catálogo",
        passwordHash: await hashPassword("clave-segura-123"),
        branchAssignments: {
          create: { branchCode: "el-alto", role: "medico", active: true, isDefault: true }
        }
      }
    });
    const patient = await createPatientRecord({
      branchCode: "el-alto",
      fullName: "Paciente Estudio Administrable",
      phone: "+591 70000108",
      captureSource: "whatsapp"
    });
    const visit = await createVisitRecord({
      branchCode: "el-alto",
      patientId: patient.id,
      userId: doctor.id,
      reason: "Requiere análisis"
    });
    await updateVisitRouteStatus({
      visitId: visit.id,
      branchCode: "el-alto",
      userId: doctor.id,
      status: "in_consultation",
      area: "medico",
      note: "Consulta activa"
    });
    const catalogItem = await createServiceCatalogItemRecord({
      branchCode: "el-alto",
      code: "TEST-STUDY-GLUCOSA",
      name: "Glucosa en sangre",
      category: "Estudios",
      kind: "study",
      basePriceCents: 7500,
      requiresNursing: true,
      ownMaxDiscountCents: 1000,
      userId: doctor.id
    });

    expect(await getActiveStudyCatalogItems("el-alto")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: catalogItem.id, name: "Glucosa en sangre" })
      ])
    );

    const { sale, workItem } = await createPaidStudyOrder({
      visitId: visit.id,
      branchCode: "el-alto",
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
      await releasePaidStudiesToNursing({
        workItemId: workItem.id,
        branchCode: "el-alto",
        userId: doctor.id
      });
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
      branchCode: "el-alto",
      userId: doctor.id
    });

    expect(nursingWorkItem).toMatchObject({
      area: "enfermeria",
      title: "Realizar estudios/servicios pagados"
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
        branchAssignments: {
          create: { branchCode: "el-alto", role: "medico", active: true, isDefault: true }
        }
      }
    });
    const nurse = await prisma.internalUser.create({
      data: {
        email: "enfermeria-v33@example.com",
        name: "Enfermeria V33",
        passwordHash: await hashPassword("clave-segura-123"),
        branchAssignments: {
          create: { branchCode: "el-alto", role: "enfermeria", active: true, isDefault: true }
        }
      }
    });
    const patient = await createPatientRecord({
      branchCode: "el-alto",
      fullName: "Paciente V33",
      phone: "+591 70000033",
      captureSource: "whatsapp"
    });
    const visit = await createVisitRecord({
      branchCode: "el-alto",
      patientId: patient.id,
      userId: doctor.id,
      reason: "Control"
    });

    await updateVisitRouteStatus({
      visitId: visit.id,
      branchCode: "el-alto",
      userId: doctor.id,
      status: "in_consultation",
      area: "medico",
      note: "Consulta activa"
    });

    const order = await createClinicalOrderRecord({
      visitId: visit.id,
      branchCode: "el-alto",
      doctorId: doctor.id,
      type: "nursing_application",
      targetArea: "enfermeria",
      title: "Aplicar suero ABC",
      details: "500 ml por vía IV"
    });
    const workItem = (await getNursingWorkItems({ branchCode: "el-alto" }))[0];

    await assignNursingWorkItem({
      workItemId: workItem.id,
      branchCode: "el-alto",
      userId: nurse.id
    });
    await createVitalSignsRecord({
      branchCode: "el-alto",
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
      branchCode: "el-alto",
      workItemId: workItem.id,
      clinicalOrderId: order.id,
      responsibleId: nurse.id,
      medication: "Suero ABC",
      quantity: "500 ml",
      route: "IV"
    });
    await createStudyRecord({
      branchCode: "el-alto",
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

    const detail = await getNursingWorkItemById(workItem.id, "el-alto");
    const studies = await getStudiesForVisit(visit.id, "el-alto");
    const patientDetail = await getPatientById(patient.id, "el-alto");

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

  it("limits nursing continuity to its role and invalidates it after changing branch", async () => {
    const nurse = await prisma.internalUser.create({
      data: {
        email: "enfermeria-continuidad@example.com",
        passwordHash: await hashPassword("clave-segura-123"),
        branchAssignments: {
          create: [
            { branchCode: "el-alto", role: "enfermeria", active: true, isDefault: true },
            { branchCode: "cochabamba", role: "enfermeria", active: true }
          ]
        }
      }
    });
    const patient = await createPatientRecord({
      branchCode: "el-alto",
      fullName: "Paciente Continuidad Enfermería",
      phone: "+591 70000109",
      captureSource: "whatsapp",
      createdById: nurse.id
    });
    await prisma.patientBranchRecord.create({
      data: {
        patientId: patient.id,
        branchCode: "cochabamba",
        recordNumber: `cochabamba-${patient.internalCode}`
      }
    });
    const [currentVisit, remoteVisit] = await Promise.all([
      createVisitRecord({
        branchCode: "el-alto",
        patientId: patient.id,
        userId: nurse.id,
        reason: "Continuidad asistencial"
      }),
      createVisitRecord({
        branchCode: "cochabamba",
        patientId: patient.id,
        userId: nurse.id,
        reason: "Atención anterior"
      })
    ]);
    await appendPatientConsentRecord({
      patientId: patient.id,
      branchCode: "el-alto",
      purpose: "clinical_continuity",
      decision: "granted",
      contactChannels: [],
      captureMethod: "written_form",
      recordedById: nurse.id
    });
    await createVitalSignsRecord({
      branchCode: "cochabamba",
      patientId: patient.id,
      visitId: remoteVisit.id,
      recordedById: nurse.id,
      heartRateBpm: 76
    });
    await createNursingNoteRecord({
      branchCode: "cochabamba",
      patientId: patient.id,
      visitId: remoteVisit.id,
      userId: nurse.id,
      note: "Observación necesaria para el relevo"
    });
    await createClinicalOrderRecord({
      visitId: remoteVisit.id,
      branchCode: "cochabamba",
      type: "nursing_application",
      targetArea: "enfermeria",
      title: "Orden necesaria"
    });

    const access = await runWithDatabaseRlsContext({
      branchCode: "el-alto", userId: nurse.id, effectiveRole: "enfermeria", accessMode: "work"
    }, () => createNursingContinuityAccess({
        patientId: patient.id,
        visitId: currentVisit.id,
        nurseId: nurse.id,
        branchCode: "el-alto",
        reason: "Necesito verificar la atención previa"
      }));
    const history = await runWithDatabaseRlsContext({
      branchCode: "el-alto", userId: nurse.id, effectiveRole: "enfermeria", accessMode: "work"
    }, () => getNursingContinuityHistory({
        patientId: patient.id,
        visitId: currentVisit.id,
        nurseId: nurse.id,
        branchCode: "el-alto",
        accessId: access.id
      }));

    expect(history.active).toBe(true);
    expect(history.visits).toHaveLength(1);
    expect(history.visits[0]?.branch.code).toBe("cochabamba");
    expect(history.visits[0]?.vitalSigns[0]?.heartRateBpm).toBe(76);
    expect(history.visits[0]?.clinicalOrders).toHaveLength(1);
    expect(history.visits[0]).not.toHaveProperty("clinicalConsultation");
    await expect(
      runWithDatabaseRlsContext({
        branchCode: "cochabamba", userId: nurse.id, effectiveRole: "enfermeria", accessMode: "work"
      }, () => getNursingContinuityHistory({
          patientId: patient.id,
          visitId: currentVisit.id,
          nurseId: nurse.id,
          branchCode: "cochabamba",
          accessId: access.id
        }))
    ).resolves.toEqual({ visits: [], active: false });
    await expect(
      createVitalSignsRecord({
        branchCode: "el-alto",
        patientId: patient.id,
        visitId: remoteVisit.id,
        recordedById: nurse.id,
        heartRateBpm: 77
      })
    ).rejects.toThrow();
  });
});
