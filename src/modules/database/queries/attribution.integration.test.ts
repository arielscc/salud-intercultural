import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";
import { getCaptureAttributionReport } from "@/modules/database/queries/attribution";
import { createReceptionIntake } from "@/modules/database/queries/reception";
import { syncPayloadCampaignToSigeco } from "@/modules/payload-sigeco/campaign-sync";

async function cleanAttributionFixtures() {
  await prisma.sale.deleteMany();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "TreatmentProposalOutcome", "ClinicalOrder" CASCADE'
  );
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "PatientConsent" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "VisitAreaTimeEvent" CASCADE');
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.captureCampaign.deleteMany({
    where: { code: "TEST-PAYLOAD-SYNC" }
  });
}

async function seedAttributionCatalog() {
  const tiktok = await prisma.captureSource.upsert({
    where: { code: "tiktok" },
    create: {
      code: "tiktok",
      patientLabel: "TikTok",
      internalLabel: "TikTok",
      category: "social"
    },
    update: {}
  });
  await prisma.captureSource.upsert({
    where: { code: "whatsapp" },
    create: {
      code: "whatsapp",
      patientLabel: "WhatsApp",
      internalLabel: "WhatsApp",
      category: "messaging"
    },
    update: {}
  });
  await prisma.captureCampaign.upsert({
    where: { code: "TIKTOK-DR" },
    create: {
      code: "TIKTOK-DR",
      name: "TikTok Dr. Franco",
      sourceId: tiktok.id,
      accountLabel: "TikTok del Dr. Franco",
      trafficType: "organic"
    },
    update: {}
  });
}

beforeEach(async () => {
  await cleanAttributionFixtures();
  await seedAttributionCatalog();
});
afterEach(cleanAttributionFixtures);

describe("capture attribution integration", () => {
  it("retries the same Payload revision without duplicating a campaign", async () => {
    const snapshot = {
      externalId: "integration-campaign-27",
      revision: "2026-08-01T12:00:00.000Z",
      code: "TEST-PAYLOAD-SYNC",
      name: "Campaña sintética",
      sourceCode: "tiktok",
      trafficType: "paid" as const,
      active: true
    };

    const first = await syncPayloadCampaignToSigeco(snapshot);
    const retry = await syncPayloadCampaignToSigeco(snapshot);

    expect(retry.campaign.id).toBe(first.campaign.id);
    expect(
      await prisma.captureCampaign.count({
        where: { payloadCampaignId: snapshot.externalId }
      })
    ).toBe(1);
  });

  it("compares primary, support, verified account, sales and collected income", async () => {
    const campaign = await prisma.captureCampaign.findUniqueOrThrow({
      where: { code: "TIKTOK-DR" }
    });
    const created = await createReceptionIntake({
      patient: {
        fullName: "Paciente atribución",
        phone: "70000088",
        city: "Cochabamba",
        department: "Cochabamba",
        country: "Bolivia",
        captureSource: "tiktok",
        captureSources: ["tiktok", "whatsapp"]
      },
      visit: {
        reason: "Consulta desde campaña",
        originCity: "Cochabamba",
        originDepartment: "Cochabamba",
        originCountry: "Bolivia",
        originMatchesPatient: true
      },
      attribution: {
        primarySourceCode: "tiktok",
        supportSourceCodes: ["whatsapp"],
        campaignId: campaign.id,
        evidenceKind: "campaign_link",
        externalEvidenceCode: "TIKTOK-DR"
      }
    });

    const consultation = await prisma.clinicalConsultation.create({
      data: {
        visitId: created.visit.id,
        patientId: created.patientId,
        motive: "Valoración",
        treatmentPlanText: "Plan propuesto"
      }
    });
    const administrationOrder = await prisma.clinicalOrder.create({
      data: {
        visitId: created.visit.id,
        patientId: created.patientId,
        type: "administration",
        targetArea: "administracion",
        title: "Iniciar tratamiento"
      }
    });
    await prisma.treatmentProposalOutcome.create({
      data: {
        consultationId: consultation.id,
        visitId: created.visit.id,
        status: "accepted",
        reason: "agreed_to_start",
        administrationInstruction: "Coordinar inicio del tratamiento",
        administrationOrderId: administrationOrder.id
      }
    });
    await prisma.sale.create({
      data: {
        patientId: created.patientId,
        visitId: created.visit.id,
        totalCents: 50000,
        paidCents: 30000,
        balanceCents: 20000
      }
    });

    const report = await getCaptureAttributionReport({
      city: "Cochabamba",
      department: "Cochabamba"
    });
    const tiktok = report.sources.find((source) => source.code === "tiktok");
    const whatsapp = report.sources.find(
      (source) => source.code === "whatsapp"
    );

    expect(report.totals).toMatchObject({
      arrivals: 1,
      patients: 1,
      proposals: 1,
      sales: 1,
      soldCents: 50000,
      collectedCents: 30000
    });
    expect(tiktok).toMatchObject({
      primaryArrivals: 1,
      assistedArrivals: 1,
      proposals: 1,
      sales: 1,
      collectedCents: 30000
    });
    expect(whatsapp).toMatchObject({
      primaryArrivals: 0,
      assistedArrivals: 1,
      sales: 0,
      collectedCents: 0
    });
    expect(report.campaigns[0]).toMatchObject({
      code: "TIKTOK-DR",
      accountLabel: "TikTok del Dr. Franco",
      trafficType: "organic",
      arrivals: 1,
      sales: 1,
      collectedCents: 30000
    });
  });
});
