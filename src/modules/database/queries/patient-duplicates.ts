import type { Prisma } from "@/generated/prisma/client";
import {
  duplicateMatchSignals,
  normalizePatientName,
  normalizePatientDocument,
  normalizePatientPhone,
  patientPairKey,
  type DuplicateIdentity
} from "@/features/patient-duplicates/normalize";
import { prisma, withDatabaseError } from "@/modules/database";

const mergeImpactCountSelect = {
  convertedLeads: true,
  contacts: true,
  notes: true,
  visits: true,
  clinicalConsultations: true,
  prescriptions: true,
  clinicalEvolutions: true,
  clinicalNotes: true,
  clinicalOrders: true,
  vitalSigns: true,
  nursingApplications: true,
  nursingNotes: true,
  studies: true,
  sales: true,
  payments: true,
  deliveredProducts: true,
  cashMovements: true,
  followUpTasks: true,
  clinicalAttachments: true,
  consents: true,
  visitAttributions: true,
  branchRecords: true
} satisfies Prisma.PatientCountOutputTypeSelect;

const duplicatePatientSelect = {
  id: true,
  internalCode: true,
  documentNumber: true,
  normalizedDocumentNumber: true,
  fullName: true,
  phone: true,
  secondaryPhone: true,
  birthDate: true,
  gender: true,
  city: true,
  department: true,
  country: true,
  address: true,
  captureSource: true,
  captureSources: true,
  firstVisitAt: true,
  followUpPreference: true,
  status: true,
  normalizedName: true,
  normalizedPhone: true,
  normalizedSecondaryPhone: true,
  mergedIntoId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: mergeImpactCountSelect }
} satisfies Prisma.PatientSelect;

type DuplicatePatientIdentity = DuplicateIdentity & {
  id: string;
  normalizedName: string;
  normalizedPhone: string;
};

function patientSnapshot(
  patient: Prisma.PatientGetPayload<{ select: typeof duplicatePatientSelect }>
) {
  return {
    id: patient.id,
    internalCode: patient.internalCode,
    documentNumber: patient.documentNumber,
    fullName: patient.fullName,
    phone: patient.phone,
    secondaryPhone: patient.secondaryPhone,
    birthDate: patient.birthDate?.toISOString() ?? null,
    gender: patient.gender,
    city: patient.city,
    department: patient.department,
    country: patient.country,
    address: patient.address,
    captureSource: patient.captureSource,
    captureSources: patient.captureSources,
    firstVisitAt: patient.firstVisitAt?.toISOString() ?? null,
    followUpPreference: patient.followUpPreference,
    status: patient.status,
    createdAt: patient.createdAt.toISOString()
  };
}

function chooseOlderPatient<
  T extends { firstVisitAt: Date | null; createdAt: Date }
>(first: T, second: T) {
  const firstDate = first.firstVisitAt ?? first.createdAt;
  const secondDate = second.firstVisitAt ?? second.createdAt;
  return firstDate <= secondDate ? first : second;
}

export async function findDuplicatePatientMatches(input: {
  scope: PatientDuplicateScope;
  documentNumber?: string | null;
  fullName: string;
  phone: string;
  secondaryPhone?: string | null;
  birthDate?: Date | null;
  excludePatientId?: string;
}) {
  return withDatabaseError("findDuplicatePatientMatches", async () => {
    const branchCode = duplicateScopeBranch(input.scope);
    const normalizedPhone = normalizePatientPhone(input.phone);
    const normalizedDocument = normalizePatientDocument(input.documentNumber);
    const normalizedSecondaryPhone = input.secondaryPhone
      ? normalizePatientPhone(input.secondaryPhone)
      : "";
    const normalizedPhones = [
      normalizedPhone,
      normalizedSecondaryPhone
    ].filter((phone) => phone.length >= 7);
    const normalizedName = normalizePatientName(input.fullName);
    const alternatives = await prisma.patient.findMany({
      where: {
        branchRecords: branchCode ? { some: { branchCode } } : undefined,
        id: input.excludePatientId ? { not: input.excludePatientId } : undefined,
        mergedIntoId: null,
        status: { not: "archived" },
        OR: [
          normalizedDocument.length >= 4
            ? { normalizedDocumentNumber: normalizedDocument }
            : { id: "__invalid_document__" },
          normalizedPhones.length > 0
            ? {
                OR: [
                  { normalizedPhone: { in: normalizedPhones } },
                  { normalizedSecondaryPhone: { in: normalizedPhones } }
                ]
              }
            : { id: "__invalid_phone__" },
          normalizedName.length >= 4
            ? { normalizedName }
            : { id: "__invalid_name__" }
        ]
      },
      select: {
        id: true,
        internalCode: true,
        documentNumber: true,
        fullName: true,
        phone: true,
        secondaryPhone: true,
        birthDate: true,
        normalizedName: true,
        normalizedPhone: true,
        normalizedSecondaryPhone: true
      },
      take: 12,
      orderBy: { updatedAt: "desc" }
    });

    return alternatives
      .map((patient) => ({
        patient,
        signals: duplicateMatchSignals(input, patient)
      }))
      .filter((match) => match.signals.isCandidate)
      .sort((first, second) => second.signals.score - first.signals.score);
  });
}

async function upsertDuplicateCandidate(
  tx: Prisma.TransactionClient,
  first: DuplicatePatientIdentity,
  second: DuplicatePatientIdentity
) {
  const signals = duplicateMatchSignals(first, second);
  if (!signals.isCandidate) return null;

  const [patientAId, patientBId] = [first.id, second.id].sort();
  const pairKey = patientPairKey(first.id, second.id);
  const existing = await tx.patientDuplicateCandidate.findUnique({
    where: { pairKey },
    select: { status: true, documentMatch: true, phoneMatch: true, score: true }
  });
  const shouldReopen =
    existing?.status === "dismissed" &&
    ((!existing.documentMatch && signals.documentMatch) ||
      (!existing.phoneMatch && signals.phoneMatch) ||
      signals.score > existing.score);

  return tx.patientDuplicateCandidate.upsert({
    where: { pairKey },
    create: {
      pairKey,
      patientAId,
      patientBId,
      documentMatch: signals.documentMatch,
      phoneMatch: signals.phoneMatch,
      nameMatch: signals.nameMatch,
      birthDateMatch: signals.birthDateMatch,
      score: signals.score
    },
    update: {
      documentMatch: signals.documentMatch,
      phoneMatch: signals.phoneMatch,
      nameMatch: signals.nameMatch,
      birthDateMatch: signals.birthDateMatch,
      score: signals.score,
      lastDetectedAt: new Date(),
      status: shouldReopen ? "open" : undefined,
      reviewedAt: shouldReopen ? null : undefined,
      reviewedById: shouldReopen ? null : undefined
    }
  });
}

export async function recordDuplicateCandidatesInTransaction(
  tx: Prisma.TransactionClient,
  patientId: string
) {
  const patient = await tx.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      documentNumber: true,
      fullName: true,
      phone: true,
      secondaryPhone: true,
      birthDate: true,
      normalizedName: true,
      normalizedDocumentNumber: true,
      normalizedPhone: true,
      normalizedSecondaryPhone: true,
      mergedIntoId: true
    }
  });
  if (!patient || patient.mergedIntoId) return [];

  const normalizedPhones = [
    patient.normalizedPhone,
    patient.normalizedSecondaryPhone
  ].filter((phone) => phone.length >= 7);
  const alternatives = await tx.patient.findMany({
    where: {
      id: { not: patient.id },
      mergedIntoId: null,
      status: { not: "archived" },
      OR: [
        patient.normalizedDocumentNumber.length >= 4
          ? { normalizedDocumentNumber: patient.normalizedDocumentNumber }
          : { id: "__invalid_document__" },
        normalizedPhones.length > 0
          ? {
              OR: [
                { normalizedPhone: { in: normalizedPhones } },
                { normalizedSecondaryPhone: { in: normalizedPhones } }
              ]
            }
          : { id: "__invalid_phone__" },
        patient.normalizedName.length >= 4
          ? { normalizedName: patient.normalizedName }
          : { id: "__invalid_name__" }
      ]
    },
    select: {
      id: true,
      documentNumber: true,
      fullName: true,
      phone: true,
      secondaryPhone: true,
      birthDate: true,
      normalizedName: true,
      normalizedDocumentNumber: true,
      normalizedPhone: true,
      normalizedSecondaryPhone: true
    },
    take: 24
  });

  const candidates = [];
  for (const alternative of alternatives) {
    const candidate = await upsertDuplicateCandidate(tx, patient, alternative);
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}

export async function recordDuplicateCandidatesForPatient(patientId: string) {
  return withDatabaseError("recordDuplicateCandidatesForPatient", async () => {
    return prisma.$transaction((tx) =>
      recordDuplicateCandidatesInTransaction(tx, patientId)
    );
  });
}

export type PatientDuplicateScope = "global" | { branchCode: string };

function duplicateScopeBranch(scope: PatientDuplicateScope) {
  return scope === "global" ? null : scope.branchCode;
}

export async function getPatientDuplicateQueue(scope: PatientDuplicateScope) {
  return withDatabaseError("getPatientDuplicateQueue", async () => {
    const branchCode = duplicateScopeBranch(scope);
    return prisma.patientDuplicateCandidate.findMany({
      where: {
        status: "open",
        patientA: {
          mergedIntoId: null,
          branchRecords: branchCode ? { some: { branchCode } } : undefined
        },
        patientB: {
          mergedIntoId: null,
          branchRecords: branchCode ? { some: { branchCode } } : undefined
        }
      },
      include: {
        patientA: { select: duplicatePatientSelect },
        patientB: { select: duplicatePatientSelect }
      },
      orderBy: [{ score: "desc" }, { lastDetectedAt: "desc" }]
    });
  });
}

export async function getPatientDuplicateCandidate(
  candidateId: string,
  scope: PatientDuplicateScope
) {
  return withDatabaseError("getPatientDuplicateCandidate", async () => {
    const branchCode = duplicateScopeBranch(scope);
    return prisma.patientDuplicateCandidate.findFirst({
      where: {
        id: candidateId,
        patientA: {
          branchRecords: branchCode ? { some: { branchCode } } : undefined
        },
        patientB: {
          branchRecords: branchCode ? { some: { branchCode } } : undefined
        }
      },
      include: {
        patientA: {
          select: {
            ...duplicatePatientSelect,
            aliases: { orderBy: { createdAt: "desc" } }
          }
        },
        patientB: {
          select: {
            ...duplicatePatientSelect,
            aliases: { orderBy: { createdAt: "desc" } }
          }
        },
        reviewedBy: { select: { name: true, email: true } },
        merge: true
      }
    });
  });
}

export async function dismissPatientDuplicateCandidate(input: {
  candidateId: string;
  reviewedById: string;
  scope: PatientDuplicateScope;
}) {
  return withDatabaseError("dismissPatientDuplicateCandidate", async () => {
    const branchCode = duplicateScopeBranch(input.scope);
    return prisma.$transaction(async (tx) => {
      const result = await tx.patientDuplicateCandidate.updateMany({
        where: {
          id: input.candidateId,
          status: "open",
          patientA: {
            branchRecords: branchCode
              ? { some: { branchCode } }
              : undefined
          },
          patientB: {
            branchRecords: branchCode
              ? { some: { branchCode } }
              : undefined
          }
        },
        data: {
          status: "dismissed",
          reviewedAt: new Date(),
          reviewedById: input.reviewedById
        }
      });
      if (result.count !== 1) {
        throw new Error("DUPLICATE_CANDIDATE_NOT_OPEN");
      }
      return tx.patientDuplicateCandidate.findUniqueOrThrow({
        where: { id: input.candidateId }
      });
    });
  });
}

export async function mergeDuplicatePatients(input: {
  candidateId: string;
  sourcePatientId: string;
  targetPatientId: string;
  mergedById: string;
  confirmation: string;
}) {
  return withDatabaseError("mergeDuplicatePatients", async () => {
    return prisma.$transaction(
      async (tx) => {
        const candidate = await tx.patientDuplicateCandidate.findUnique({
          where: { id: input.candidateId }
        });
        if (!candidate || candidate.status !== "open") {
          throw new Error("DUPLICATE_CANDIDATE_NOT_OPEN");
        }

        const pairIds = [candidate.patientAId, candidate.patientBId].sort();
        const requestedIds = [
          input.sourcePatientId,
          input.targetPatientId
        ].sort();
        if (pairIds.join(":") !== requestedIds.join(":")) {
          throw new Error("DUPLICATE_CANDIDATE_MISMATCH");
        }

        const [source, target] = await Promise.all([
          tx.patient.findUnique({
            where: { id: input.sourcePatientId },
            select: duplicatePatientSelect
          }),
          tx.patient.findUnique({
            where: { id: input.targetPatientId },
            select: duplicatePatientSelect
          })
        ]);
        if (!source || !target || source.mergedIntoId || target.mergedIntoId) {
          throw new Error("PATIENT_NOT_AVAILABLE_FOR_MERGE");
        }
        if (!duplicateMatchSignals(source, target).isCandidate) {
          throw new Error("DUPLICATE_CANDIDATE_NO_LONGER_MATCHES");
        }
        if (input.confirmation !== target.internalCode) {
          throw new Error("INVALID_PATIENT_MERGE_CONFIRMATION");
        }

        const oldest = chooseOlderPatient(source, target);
        const captureIds = async (
          name: string,
          query: Promise<Array<{ id: string }>>
        ) => {
          const records = await query;
          return [name, records.map((record) => record.id)] as const;
        };
        const movedRecordIds = Object.fromEntries(
          await Promise.all(
            [
              captureIds("convertedLeads", tx.lead.findMany({ where: { convertedPatientId: source.id }, select: { id: true } })),
              captureIds("contacts", tx.patientContact.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("notes", tx.patientNote.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("visits", tx.visit.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("visitAttributions", tx.visitAttribution.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("clinicalConsultations", tx.clinicalConsultation.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("prescriptions", tx.prescription.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("clinicalEvolutions", tx.clinicalEvolution.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("clinicalNotes", tx.clinicalNote.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("clinicalOrders", tx.clinicalOrder.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("studies", tx.study.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("vitalSigns", tx.vitalSigns.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("nursingApplications", tx.nursingApplication.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("nursingNotes", tx.nursingNote.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("clinicalAttachments", tx.clinicalAttachment.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("sales", tx.sale.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("payments", tx.payment.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("deliveredProducts", tx.deliveredProduct.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("cashMovements", tx.cashMovement.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("followUpTasks", tx.followUpTask.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("consents", tx.patientConsent.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("reminderCandidates", tx.supervisedReminderCandidate.findMany({ where: { patientId: source.id }, select: { id: true } })),
              captureIds("feedbackRequests", tx.patientFeedbackRequest.findMany({ where: { patientId: source.id }, select: { id: true } }))
            ]
          )
        );
        const movedRelations: Record<string, number> = {};
        const move = async (
          name: string,
          operation: Promise<{ count: number }>
        ) => {
          const result = await operation;
          movedRelations[name] = result.count;
        };

        const [sourceBranchRecords, targetBranchRecords] = await Promise.all([
          tx.patientBranchRecord.findMany({ where: { patientId: source.id } }),
          tx.patientBranchRecord.findMany({ where: { patientId: target.id } })
        ]);
        const targetBranchByCode = new Map(
          targetBranchRecords.map((record) => [record.branchCode, record])
        );
        for (const sourceRecord of sourceBranchRecords) {
          const targetRecord = targetBranchByCode.get(sourceRecord.branchCode);
          await tx.patientBranchRecord.upsert({
            where: {
              patientId_branchCode: {
                patientId: target.id,
                branchCode: sourceRecord.branchCode
              }
            },
            create: {
              patientId: target.id,
              branchCode: sourceRecord.branchCode,
              recordNumber: `${sourceRecord.branchCode}-${target.internalCode}`,
              status: sourceRecord.status,
              generalObservations: sourceRecord.generalObservations,
              allergies: sourceRecord.allergies,
              relevantHistory: sourceRecord.relevantHistory,
              currentMedication: sourceRecord.currentMedication,
              firstAttendedAt: sourceRecord.firstAttendedAt,
              lastAttendedAt: sourceRecord.lastAttendedAt
            },
            update: {
              generalObservations:
                targetRecord?.generalObservations ?? sourceRecord.generalObservations,
              allergies: targetRecord?.allergies ?? sourceRecord.allergies,
              relevantHistory:
                targetRecord?.relevantHistory ?? sourceRecord.relevantHistory,
              currentMedication:
                targetRecord?.currentMedication ?? sourceRecord.currentMedication,
              firstAttendedAt:
                targetRecord?.firstAttendedAt && sourceRecord.firstAttendedAt
                  ? targetRecord.firstAttendedAt < sourceRecord.firstAttendedAt
                    ? targetRecord.firstAttendedAt
                    : sourceRecord.firstAttendedAt
                  : targetRecord?.firstAttendedAt ?? sourceRecord.firstAttendedAt,
              lastAttendedAt:
                targetRecord?.lastAttendedAt && sourceRecord.lastAttendedAt
                  ? targetRecord.lastAttendedAt > sourceRecord.lastAttendedAt
                    ? targetRecord.lastAttendedAt
                    : sourceRecord.lastAttendedAt
                  : targetRecord?.lastAttendedAt ?? sourceRecord.lastAttendedAt
            }
          });
        }

        await move(
          "convertedLeads",
          tx.lead.updateMany({
            where: { convertedPatientId: source.id },
            data: { convertedPatientId: target.id }
          })
        );
        await move(
          "contacts",
          tx.patientContact.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "notes",
          tx.patientNote.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "visits",
          tx.visit.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "visitAttributions",
          tx.visitAttribution.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "clinicalConsultations",
          tx.clinicalConsultation.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "prescriptions",
          tx.prescription.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "clinicalEvolutions",
          tx.clinicalEvolution.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "clinicalNotes",
          tx.clinicalNote.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "clinicalOrders",
          tx.clinicalOrder.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "studies",
          tx.study.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "vitalSigns",
          tx.vitalSigns.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "nursingApplications",
          tx.nursingApplication.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "nursingNotes",
          tx.nursingNote.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "clinicalAttachments",
          tx.clinicalAttachment.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "sales",
          tx.sale.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "payments",
          tx.payment.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "deliveredProducts",
          tx.deliveredProduct.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "cashMovements",
          tx.cashMovement.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "followUpTasks",
          tx.followUpTask.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "consents",
          tx.patientConsent.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "reminderCandidates",
          tx.supervisedReminderCandidate.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );
        await move(
          "feedbackRequests",
          tx.patientFeedbackRequest.updateMany({
            where: { patientId: source.id },
            data: { patientId: target.id }
          })
        );

        const mergedTarget = await tx.patient.update({
          where: { id: target.id },
          data: {
            documentNumber: target.documentNumber ?? source.documentNumber,
            normalizedDocumentNumber: target.documentNumber
              ? normalizePatientDocument(target.documentNumber)
              : normalizePatientDocument(source.documentNumber),
            secondaryPhone: target.secondaryPhone ?? source.secondaryPhone,
            normalizedSecondaryPhone: target.secondaryPhone
              ? normalizePatientPhone(target.secondaryPhone)
              : source.secondaryPhone
                ? normalizePatientPhone(source.secondaryPhone)
                : "",
            birthDate: target.birthDate ?? source.birthDate,
            city: target.city ?? source.city,
            department: target.department ?? source.department,
            country: target.country ?? source.country,
            address: target.address ?? source.address,
            firstVisitAt:
              source.firstVisitAt && target.firstVisitAt
                ? source.firstVisitAt < target.firstVisitAt
                  ? source.firstVisitAt
                  : target.firstVisitAt
                : source.firstVisitAt ?? target.firstVisitAt,
            captureSource: oldest.captureSource,
            captureSources: Array.from(
              new Set([...target.captureSources, ...source.captureSources])
            ),
            revision: { increment: 1 }
          }
        });
        await tx.patientIdentityVersion.create({
          data: {
            patientId: mergedTarget.id,
            revision: mergedTarget.revision,
            internalCode: mergedTarget.internalCode,
            documentNumber: mergedTarget.documentNumber,
            normalizedDocumentNumber: mergedTarget.normalizedDocumentNumber,
            fullName: mergedTarget.fullName,
            phone: mergedTarget.phone,
            secondaryPhone: mergedTarget.secondaryPhone,
            birthDate: mergedTarget.birthDate,
            gender: mergedTarget.gender,
            city: mergedTarget.city,
            department: mergedTarget.department,
            country: mergedTarget.country,
            address: mergedTarget.address,
            changedById: input.mergedById,
            changeReason: `Fusión de identidad ${source.internalCode}`
          }
        });

        await tx.patientAlias.create({
          data: {
            patientId: target.id,
            sourcePatientId: source.id,
            internalCode: source.internalCode,
            documentNumber: source.documentNumber,
            normalizedDocumentNumber: source.normalizedDocumentNumber,
            fullName: source.fullName,
            normalizedName: source.normalizedName,
            phone: source.phone,
            secondaryPhone: source.secondaryPhone,
            normalizedPhone: source.normalizedPhone,
            normalizedSecondaryPhone: source.normalizedSecondaryPhone,
            birthDate: source.birthDate
          }
        });

        const merge = await tx.patientMerge.create({
          data: {
            sourcePatientId: source.id,
            targetPatientId: target.id,
            mergedById: input.mergedById,
            sourceSnapshot: patientSnapshot(source),
            targetSnapshot: patientSnapshot(target),
            impact: {
              counts: movedRelations,
              recordIds: movedRecordIds
            }
          }
        });

        await tx.patientBranchRecord.deleteMany({
          where: { patientId: source.id }
        });

        await tx.patient.update({
          where: { id: source.id },
          data: {
            status: "archived",
            mergedIntoId: target.id
          }
        });
        await tx.patientDuplicateCandidate.update({
          where: { id: candidate.id },
          data: {
            status: "merged",
            mergeId: merge.id,
            reviewedAt: new Date(),
            reviewedById: input.mergedById
          }
        });

        return {
          merge,
          sourcePatientId: source.id,
          targetPatientId: target.id,
          targetInternalCode: target.internalCode,
          movedRelations
        };
      },
      { isolationLevel: "Serializable" }
    );
  });
}
