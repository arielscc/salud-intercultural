import type {
  AttributionEvidenceKind,
  AttributionTrafficType,
  CaptureSourceCategory,
  Prisma
} from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";

export type CaptureSourceOption = {
  id: string;
  code: string;
  patientLabel: string;
  internalLabel: string;
  category: CaptureSourceCategory;
};

export async function getReceptionCaptureSources() {
  return withDatabaseError("getReceptionCaptureSources", async () => {
    return prisma.captureSource.findMany({
      where: { active: true, receptionSelectable: true },
      select: {
        id: true,
        code: true,
        patientLabel: true,
        internalLabel: true,
        category: true
      },
      orderBy: [{ sortOrder: "asc" }, { patientLabel: "asc" }]
    });
  });
}

export async function getCaptureCatalog(branchCode: string) {
  return withDatabaseError("getCaptureCatalog", async () => {
    return Promise.all([
      prisma.captureSource.findMany({
        include: {
          _count: {
            select: {
              campaigns: {
                where: {
                  branchAssignments: {
                    some: { branchCode, active: true }
                  }
                }
              },
              attributionTouches: { where: { branchCode } }
            }
          }
        },
        orderBy: [{ sortOrder: "asc" }, { patientLabel: "asc" }]
      }),
      prisma.captureCampaignBranch.findMany({
        where: { branchCode, active: true },
        include: {
          campaign: { include: { source: true } },
          _count: { select: { attributions: true } }
        },
        orderBy: [{ campaign: { active: "desc" } }, { campaign: { createdAt: "desc" } }]
      })
    ]).then(([sources, assignments]) => [
      sources,
      assignments.map((assignment) => ({
        ...assignment.campaign,
        _count: assignment._count
      }))
    ] as const);
  });
}

export async function createCaptureSourceRecord(input: {
  code: string;
  patientLabel: string;
  internalLabel: string;
  category: CaptureSourceCategory;
  receptionSelectable: boolean;
  sortOrder: number;
}) {
  return withDatabaseError("createCaptureSourceRecord", async () => {
    return prisma.captureSource.create({ data: input });
  });
}

export async function updateCaptureSourceRecord(input: {
  sourceId: string;
  patientLabel: string;
  internalLabel: string;
  category: CaptureSourceCategory;
  active: boolean;
  receptionSelectable: boolean;
  sortOrder: number;
}) {
  return withDatabaseError("updateCaptureSourceRecord", async () => {
    return prisma.captureSource.update({
      where: { id: input.sourceId },
      data: {
        patientLabel: input.patientLabel,
        internalLabel: input.internalLabel,
        category: input.category,
        active: input.active,
        receptionSelectable: input.active && input.receptionSelectable,
        sortOrder: input.sortOrder
      }
    });
  });
}

export async function findActiveCaptureCampaignByCode(
  code: string,
  branchCode: string,
  now = new Date()
) {
  return withDatabaseError("findActiveCaptureCampaignByCode", async () => {
    return prisma.captureCampaign.findFirst({
      where: {
        code,
        active: true,
        branchAssignments: { some: { branchCode, active: true } },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
        ],
        source: { active: true }
      },
      include: { source: true }
    });
  });
}

export type VisitAttributionRecordInput = {
  branchCode: string;
  patientId: string;
  visitId: string;
  capturedById?: string;
  primarySourceCode: string;
  supportSourceCodes: string[];
  campaignId?: string;
  evidenceKind?: AttributionEvidenceKind;
  externalEvidenceCode?: string;
};

export async function createVisitAttributionInTransaction(
  tx: Prisma.TransactionClient,
  input: VisitAttributionRecordInput
) {
  const uniqueCodes = Array.from(
    new Set([input.primarySourceCode, ...input.supportSourceCodes])
  );
  const sources = await tx.captureSource.findMany({
    where: { code: { in: uniqueCodes }, active: true }
  });
  const sourceByCode = new Map(sources.map((source) => [source.code, source]));
  const primarySource = sourceByCode.get(input.primarySourceCode);

  if (!primarySource || sources.length !== uniqueCodes.length) {
    throw new Error("INVALID_CAPTURE_SOURCE");
  }

  const attributionTime = new Date();
  const campaign = input.campaignId
    ? await tx.captureCampaignBranch.findFirst({
        where: {
          campaignId: input.campaignId,
          branchCode: input.branchCode,
          active: true,
          campaign: {
            active: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: attributionTime } }] },
              { OR: [{ endsAt: null }, { endsAt: { gt: attributionTime } }] }
            ],
            source: { active: true }
          }
        },
        include: { campaign: { include: { source: true } } }
      })
    : null;

  if (input.campaignId && !campaign) {
    throw new Error("INVALID_ATTRIBUTION_EVIDENCE");
  }
  const evidenceKind = input.evidenceKind ?? "patient_reported";
  const touchBySourceId = new Map<
    string,
    {
      sourceId: string;
      role: "primary" | "support";
      evidenceKind: AttributionEvidenceKind;
      trafficType: AttributionTrafficType;
      accountLabel?: string;
      accountHandle?: string;
      campaignCode?: string;
      automaticallyCaptured: boolean;
    }
  >();

  for (const code of uniqueCodes) {
    const source = sourceByCode.get(code);
    if (!source) continue;
    touchBySourceId.set(source.id, {
      sourceId: source.id,
      role: code === input.primarySourceCode ? "primary" : "support",
      evidenceKind: "patient_reported",
      trafficType: "unidentified",
      automaticallyCaptured: false
    });
  }

  if (campaign) {
    const configuredCampaign = campaign.campaign;
    const existing = touchBySourceId.get(configuredCampaign.sourceId);
    touchBySourceId.set(configuredCampaign.sourceId, {
      sourceId: configuredCampaign.sourceId,
      role: existing?.role ?? "support",
      evidenceKind,
      trafficType: configuredCampaign.trafficType,
      accountLabel: configuredCampaign.accountLabel ?? undefined,
      accountHandle: configuredCampaign.accountHandle ?? undefined,
      campaignCode: configuredCampaign.code,
      automaticallyCaptured: true
    });
  }

  return tx.visitAttribution.create({
    data: {
      visitId: input.visitId,
      branchCode: input.branchCode,
      patientId: input.patientId,
      capturedById: input.capturedById,
      campaignId: campaign?.campaignId,
      evidenceKind,
      externalEvidenceCode: input.externalEvidenceCode,
      touches: {
        create: Array.from(touchBySourceId.values()).map((touch) => ({
          ...touch,
          branchCode: input.branchCode
        }))
      }
    },
    include: {
      campaignAssignment: { include: { campaign: true } },
      touches: { include: { source: true } }
    }
  });
}

export async function getCaptureAttributionReport(input: {
  branchCode: string;
  from?: Date;
  to?: Date;
  city?: string;
  department?: string;
}) {
  return withDatabaseError("getCaptureAttributionReport", async () => {
    const attributions = await prisma.visitAttribution.findMany({
      where: {
        branchCode: input.branchCode,
        visit: {
          checkedInAt:
            input.from || input.to ? { gte: input.from, lt: input.to } : undefined,
          originCity: input.city
            ? { contains: input.city, mode: "insensitive" }
            : undefined,
          originDepartment: input.department
            ? { equals: input.department, mode: "insensitive" }
            : undefined
        }
      },
      include: {
        campaignAssignment: {
          include: { campaign: { include: { source: true } } }
        },
        touches: { include: { source: true } },
        visit: {
          select: {
            patientId: true,
            treatmentProposalOutcomes: {
              where: { supersededBy: null },
              select: { id: true, status: true },
              take: 1
            },
            sales: {
              select: {
                id: true,
                totalCents: true,
                paidCents: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const sourceMap = new Map<
      string,
      {
        code: string;
        label: string;
        primaryArrivals: number;
        assistedArrivals: number;
        proposals: number;
        sales: number;
        soldCents: number;
        collectedCents: number;
      }
    >();
    const campaignMap = new Map<
      string,
      {
        code: string;
        name: string;
        accountLabel: string;
        trafficType: AttributionTrafficType;
        arrivals: number;
        sales: number;
        collectedCents: number;
      }
    >();

    for (const attribution of attributions) {
      const currentOutcome =
        attribution.visit.treatmentProposalOutcomes[0];
      const hasProposal =
        Boolean(currentOutcome) &&
        currentOutcome.status !== "not_applicable";
      const sales = attribution.visit.sales;

      for (const touch of attribution.touches) {
        const current = sourceMap.get(touch.sourceId) ?? {
          code: touch.source.code,
          label: touch.source.internalLabel,
          primaryArrivals: 0,
          assistedArrivals: 0,
          proposals: 0,
          sales: 0,
          soldCents: 0,
          collectedCents: 0
        };
        current.assistedArrivals += 1;

        if (touch.role === "primary") {
          current.primaryArrivals += 1;
          current.proposals += hasProposal ? 1 : 0;
          current.sales += sales.length;
          current.soldCents += sales.reduce(
            (sum, sale) => sum + sale.totalCents,
            0
          );
          current.collectedCents += sales.reduce(
            (sum, sale) => sum + sale.paidCents,
            0
          );
        }

        sourceMap.set(touch.sourceId, current);
      }

      if (attribution.campaignAssignment) {
        const campaign = attribution.campaignAssignment.campaign;
        const current = campaignMap.get(campaign.id) ?? {
          code: campaign.code,
          name: campaign.name,
          accountLabel:
            campaign.accountLabel ?? campaign.source.internalLabel,
          trafficType: campaign.trafficType,
          arrivals: 0,
          sales: 0,
          collectedCents: 0
        };
        current.arrivals += 1;
        current.sales += sales.length;
        current.collectedCents += sales.reduce(
          (sum, sale) => sum + sale.paidCents,
          0
        );
        campaignMap.set(campaign.id, current);
      }
    }

    const uniquePatients = new Set(
      attributions.map((attribution) => attribution.visit.patientId)
    ).size;
    const uniqueSales = new Map<
      string,
      { totalCents: number; paidCents: number }
    >();
    for (const attribution of attributions) {
      for (const sale of attribution.visit.sales) {
        uniqueSales.set(sale.id, sale);
      }
    }

    return {
      totals: {
        arrivals: attributions.length,
        patients: uniquePatients,
        proposals: attributions.filter(
          (attribution) => {
            const currentOutcome =
              attribution.visit.treatmentProposalOutcomes[0];
            return (
              Boolean(currentOutcome) &&
              currentOutcome.status !== "not_applicable"
            );
          }
        ).length,
        sales: uniqueSales.size,
        soldCents: Array.from(uniqueSales.values()).reduce(
          (sum, sale) => sum + sale.totalCents,
          0
        ),
        collectedCents: Array.from(uniqueSales.values()).reduce(
          (sum, sale) => sum + sale.paidCents,
          0
        )
      },
      sources: Array.from(sourceMap.values()).sort(
        (first, second) =>
          second.primaryArrivals - first.primaryArrivals ||
          first.label.localeCompare(second.label, "es")
      ),
      campaigns: Array.from(campaignMap.values()).sort(
        (first, second) =>
          second.arrivals - first.arrivals ||
          first.name.localeCompare(second.name, "es")
      )
    };
  });
}
