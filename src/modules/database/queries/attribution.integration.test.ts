import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";
import { getCaptureAttributionReport } from "@/modules/database/queries/attribution";
import { createReceptionIntake } from "@/modules/database/queries/reception";

async function cleanAttributionFixtures() {
  await prisma.sale.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
}

beforeEach(cleanAttributionFixtures);
afterEach(cleanAttributionFixtures);

describe("capture attribution integration", () => {
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

    await prisma.clinicalConsultation.create({
      data: {
        visitId: created.visit.id,
        patientId: created.patientId,
        motive: "Valoración",
        treatmentPlanText: "Plan propuesto"
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
