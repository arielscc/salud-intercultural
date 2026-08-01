import type {
  FollowUpContactPreference,
  FollowUpType,
  PatientConsent,
  Prisma,
  SupervisedReminderChannel,
  SupervisedReminderEvent
} from "@/generated/prisma/client";
import { followUpDomainByType } from "@/features/follow-ups/policy";
import { canContactPatient } from "@/features/patient-consents/policy";
import {
  normalizeReminderRuleKey,
  reminderDeduplicationKey,
  reminderEventLabels,
  renderReminderTemplate,
  scheduleSupervisedReminder
} from "@/features/supervised-reminders/policy";
import {
  reminderCandidateReviewSchema,
  reminderRuleVersionSchema
} from "@/features/supervised-reminders/schema";
import type { z } from "zod";
import { prisma, withDatabaseError } from "@/modules/database";

type RuleVersionInput = z.infer<typeof reminderRuleVersionSchema>;
type CandidateReviewInput = z.infer<typeof reminderCandidateReviewSchema>;

const currentFollowUpConsent = {
  where: { purpose: "follow_up" as const },
  orderBy: [{ decidedAt: "desc" as const }, { createdAt: "desc" as const }],
  take: 1
};

export class SupervisedReminderError extends Error {
  constructor(
    public readonly code:
      | "INVALID_OWNER"
      | "CANDIDATE_NOT_REVIEWABLE"
      | "CONSENT_BLOCKED"
      | "RULE_KEY_ALREADY_EXISTS"
  ) {
    super(code);
    this.name = "SupervisedReminderError";
  }
}

export async function saveReminderRuleVersion(input: {
  data: RuleVersionInput;
  createdById: string;
}) {
  return withDatabaseError("saveReminderRuleVersion", () =>
    prisma.$transaction(
      async (tx) => {
        const owner = await tx.internalUser.findFirst({
          where: {
            id: input.data.ownerId,
            active: true,
            role: "recepcion"
          },
          select: { id: true }
        });
        if (!owner) throw new SupervisedReminderError("INVALID_OWNER");

        let rule: { id: string; key: string };
        if (input.data.ruleId) {
          rule = await tx.supervisedReminderRule.findUniqueOrThrow({
            where: { id: input.data.ruleId },
            select: { id: true, key: true }
          });
        } else {
          const key = normalizeReminderRuleKey(input.data.name);
          if (!key) throw new SupervisedReminderError("RULE_KEY_ALREADY_EXISTS");
          const existing = await tx.supervisedReminderRule.findUnique({
            where: { key },
            select: { id: true }
          });
          if (existing) {
            throw new SupervisedReminderError("RULE_KEY_ALREADY_EXISTS");
          }
          rule = await tx.supervisedReminderRule.create({
            data: { key },
            select: { id: true, key: true }
          });
        }

        const latest = await tx.supervisedReminderRuleVersion.aggregate({
          where: { ruleId: rule.id },
          _max: { version: true }
        });
        const version = await tx.supervisedReminderRuleVersion.create({
          data: {
            ruleId: rule.id,
            version: (latest._max.version ?? 0) + 1,
            name: input.data.name,
            enabled: input.data.enabled,
            event: input.data.event,
            followUpType: input.data.followUpType,
            channel: input.data.channel,
            templateBody: input.data.templateBody,
            delayDays: input.data.delayDays,
            lookbackDays: input.data.lookbackDays,
            windowStartMinute: input.data.windowStartMinute,
            windowEndMinute: input.data.windowEndMinute,
            weekdays: Array.from(new Set(input.data.weekdays)).sort(),
            ownerId: owner.id,
            createdById: input.createdById
          }
        });
        await tx.supervisedReminderRule.update({
          where: { id: rule.id },
          data: { activeVersionId: version.id }
        });
        return { rule, version };
      },
      { isolationLevel: "Serializable" }
    )
  );
}

export async function getSupervisedReminderRules() {
  return withDatabaseError("getSupervisedReminderRules", async () =>
    prisma.supervisedReminderRule.findMany({
      include: {
        activeVersion: {
          include: {
            owner: { select: { id: true, name: true, email: true } }
          }
        },
        _count: { select: { versions: true } }
      },
      orderBy: { createdAt: "asc" }
    })
  );
}

export async function getReminderRuleOwners() {
  return withDatabaseError("getReminderRuleOwners", async () =>
    prisma.internalUser.findMany({
      where: { active: true, role: "recepcion" },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    })
  );
}

type ReminderSource = {
  sourceId: string;
  sourceEvent: SupervisedReminderEvent;
  sourceOccurredAt: Date;
  patientId: string;
  visitId: string;
  patientName: string;
  phone: string;
  followUpPreference: FollowUpContactPreference;
  consent:
    | Pick<PatientConsent, "purpose" | "decision" | "contactChannels">
    | undefined;
};

async function sourcesForRule(
  tx: Prisma.TransactionClient,
  version: {
    event: SupervisedReminderEvent;
    followUpType: FollowUpType;
    lookbackDays: number;
  },
  now: Date
): Promise<ReminderSource[]> {
  const from = new Date(
    now.getTime() - version.lookbackDays * 24 * 60 * 60 * 1000
  );
  const patientSelect = {
    id: true,
    fullName: true,
    phone: true,
    followUpPreference: true,
    consents: currentFollowUpConsent
  } satisfies Prisma.PatientSelect;

  if (version.event === "visit_completed") {
    const rows = await tx.visit.findMany({
      where: {
        isTestData: false,
        status: "completed",
        completedAt: { gte: from, lte: now },
        followUpTasks: { none: { type: version.followUpType } }
      },
      select: { id: true, completedAt: true, patient: { select: patientSelect } }
    });
    return rows.flatMap((row) =>
      row.completedAt
        ? [
            {
              sourceId: row.id,
              sourceEvent: version.event,
              sourceOccurredAt: row.completedAt,
              patientId: row.patient.id,
              visitId: row.id,
              patientName: row.patient.fullName,
              phone: row.patient.phone,
              followUpPreference: row.patient.followUpPreference,
              consent: row.patient.consents[0]
            }
          ]
        : []
    );
  }

  if (version.event === "treatment_accepted") {
    const rows = await tx.treatmentProposalOutcome.findMany({
      where: {
        status: "accepted",
        supersededBy: null,
        decidedAt: { gte: from, lte: now },
        visit: {
          isTestData: false,
          followUpTasks: { none: { type: version.followUpType } }
        }
      },
      select: {
        id: true,
        decidedAt: true,
        visit: {
          select: { id: true, patient: { select: patientSelect } }
        }
      }
    });
    return rows.map((row) => ({
      sourceId: row.id,
      sourceEvent: version.event,
      sourceOccurredAt: row.decidedAt,
      patientId: row.visit.patient.id,
      visitId: row.visit.id,
      patientName: row.visit.patient.fullName,
      phone: row.visit.patient.phone,
      followUpPreference: row.visit.patient.followUpPreference,
      consent: row.visit.patient.consents[0]
    }));
  }

  const rows = await tx.visitDiscontinuation.findMany({
    where: {
      occurredAt: { gte: from, lte: now },
      followUpTaskId: null,
      visit: {
        isTestData: false,
        followUpTasks: { none: { type: version.followUpType } }
      }
    },
    select: {
      id: true,
      occurredAt: true,
      visit: { select: { id: true, patient: { select: patientSelect } } }
    }
  });
  return rows.map((row) => ({
    sourceId: row.id,
    sourceEvent: version.event,
    sourceOccurredAt: row.occurredAt,
    patientId: row.visit.patient.id,
    visitId: row.visit.id,
    patientName: row.visit.patient.fullName,
    phone: row.visit.patient.phone,
    followUpPreference: row.visit.patient.followUpPreference,
    consent: row.visit.patient.consents[0]
  }));
}

function consentBlockReason(
  source: ReminderSource,
  channel: SupervisedReminderChannel
) {
  if (!source.consent && source.followUpPreference === "no_contact") {
    return "legacy_no_contact";
  }
  return canContactPatient(source.consent, "follow_up", channel)
    ? null
    : channel === "call"
      ? "call_not_consented"
      : "whatsapp_not_consented";
}

export async function generateSupervisedReminderCandidates(input: {
  generatedById: string;
  now?: Date;
}) {
  return withDatabaseError("generateSupervisedReminderCandidates", () =>
    prisma.$transaction(
      async (tx) => {
        const now = input.now ?? new Date();
        const rules = await tx.supervisedReminderRule.findMany({
          where: { activeVersion: { is: { enabled: true } } },
          include: { activeVersion: true }
        });
        let discovered = 0;
        let created = 0;
        let blocked = 0;

        for (const rule of rules) {
          const version = rule.activeVersion;
          if (!version) continue;
          const sources = await sourcesForRule(tx, version, now);
          discovered += sources.length;
          for (const source of sources) {
            const blockReason = consentBlockReason(source, version.channel);
            const scheduledFor = scheduleSupervisedReminder({
              eventAt: source.sourceOccurredAt,
              delayDays: version.delayDays,
              windowStartMinute: version.windowStartMinute,
              windowEndMinute: version.windowEndMinute,
              weekdays: version.weekdays
            });
            const result = await tx.supervisedReminderCandidate.createMany({
              data: [
                {
                  deduplicationKey: reminderDeduplicationKey({
                    ruleKey: rule.key,
                    sourceEvent: source.sourceEvent,
                    sourceId: source.sourceId
                  }),
                  ruleVersionId: version.id,
                  patientId: source.patientId,
                  visitId: source.visitId,
                  sourceEvent: source.sourceEvent,
                  sourceId: source.sourceId,
                  sourceOccurredAt: source.sourceOccurredAt,
                  scheduledFor,
                  channel: version.channel,
                  renderedBody: renderReminderTemplate(version.templateBody, {
                    patientName: source.patientName,
                    eventAt: source.sourceOccurredAt,
                    typeLabel: reminderEventLabels[source.sourceEvent]
                  }),
                  status: blockReason ? "blocked" : "pending_review",
                  blockReason,
                  reviewedAt: blockReason ? now : undefined
                }
              ],
              skipDuplicates: true
            });
            created += result.count;
            if (result.count > 0 && blockReason) {
              blocked += 1;
              const createdCandidate =
                await tx.supervisedReminderCandidate.findUniqueOrThrow({
                  where: {
                    deduplicationKey: reminderDeduplicationKey({
                      ruleKey: rule.key,
                      sourceEvent: source.sourceEvent,
                      sourceId: source.sourceId
                    })
                  },
                  select: { id: true }
                });
              await tx.supervisedReminderReviewEvent.create({
                data: {
                  candidateId: createdCandidate.id,
                  userId: input.generatedById,
                  result: "blocked",
                  note: blockReason
                }
              });
            }
          }
        }
        return { activeRules: rules.length, discovered, created, blocked };
      },
      { isolationLevel: "Serializable" }
    )
  );
}

export async function reviewSupervisedReminderCandidate(input: {
  data: CandidateReviewInput;
  reviewedById: string;
}) {
  return withDatabaseError("reviewSupervisedReminderCandidate", () =>
    prisma.$transaction(
      async (tx) => {
        const candidate = await tx.supervisedReminderCandidate.findUniqueOrThrow({
          where: { id: input.data.candidateId },
          include: {
            ruleVersion: true,
            patient: { include: { consents: currentFollowUpConsent } },
            task: true
          }
        });
        const now = new Date();
        if (input.data.action === "approve") {
          if (candidate.status === "approved" && candidate.task) {
            return {
              candidate,
              task: candidate.task,
              consentBlocked: false
            };
          }
          if (
            !["pending_review", "failed", "blocked"].includes(
              candidate.status
            )
          ) {
            throw new SupervisedReminderError("CANDIDATE_NOT_REVIEWABLE");
          }
          const blockReason = consentBlockReason(
            {
              sourceId: candidate.sourceId,
              sourceEvent: candidate.sourceEvent,
              sourceOccurredAt: candidate.sourceOccurredAt,
              patientId: candidate.patientId,
              visitId: candidate.visitId ?? "",
              patientName: candidate.patient.fullName,
              phone: candidate.patient.phone,
              followUpPreference: candidate.patient.followUpPreference,
              consent: candidate.patient.consents[0]
            },
            candidate.channel
          );
          if (blockReason) {
            const updated = await tx.supervisedReminderCandidate.update({
              where: { id: candidate.id },
              data: {
                status: "blocked",
                blockReason,
                reviewedById: input.reviewedById,
                reviewedAt: now
              }
            });
            await tx.supervisedReminderReviewEvent.create({
              data: {
                candidateId: candidate.id,
                userId: input.reviewedById,
                result: "blocked",
                note: blockReason
              }
            });
            return { candidate: updated, task: null, consentBlocked: true };
          }

          const task =
            candidate.task ??
            (await tx.followUpTask.create({
              data: {
                patientId: candidate.patientId,
                visitId: candidate.visitId,
                assignedToId: candidate.ruleVersion.ownerId,
                createdById: input.reviewedById,
                supervisedReminderCandidateId: candidate.id,
                type: candidate.ruleVersion.followUpType,
                domain: followUpDomainByType[candidate.ruleVersion.followUpType],
                priority: "normal",
                status: "pending",
                title: `Recordatorio supervisado — ${candidate.ruleVersion.name}`,
                notes: candidate.renderedBody,
                dueAt: candidate.scheduledFor
              }
            }));
          if (!candidate.task) {
            await tx.followUpStatusHistory.create({
              data: {
                taskId: task.id,
                userId: input.reviewedById,
                toStatus: "pending",
                note: "Aprobado desde la cola de recordatorios supervisados."
              }
            });
          }
          const updated = await tx.supervisedReminderCandidate.update({
            where: { id: candidate.id },
            data: {
              status: "approved",
              blockReason: null,
              retryAt: null,
              lastErrorCode: null,
              reviewedById: input.reviewedById,
              reviewedAt: now
            }
          });
          await tx.supervisedReminderReviewEvent.create({
            data: {
              candidateId: candidate.id,
              userId: input.reviewedById,
              result: "approved",
              note: input.data.note
            }
          });
          return { candidate: updated, task, consentBlocked: false };
        }

        const reviewableStatuses: Record<
          Exclude<CandidateReviewInput["action"], "approve">,
          string[]
        > = {
          dismiss: ["pending_review", "failed", "blocked"],
          fail: ["pending_review"],
          retry: ["failed"]
        };
        if (
          !reviewableStatuses[input.data.action].includes(candidate.status)
        ) {
          throw new SupervisedReminderError("CANDIDATE_NOT_REVIEWABLE");
        }
        const next =
          input.data.action === "dismiss"
            ? {
                status: "dismissed" as const,
                result: "dismissed" as const
              }
            : input.data.action === "fail"
              ? { status: "failed" as const, result: "failed" as const }
              : {
                  status: "pending_review" as const,
                  result: "retry_scheduled" as const
                };
        const updated = await tx.supervisedReminderCandidate.update({
          where: { id: candidate.id },
          data: {
            status: next.status,
            reviewedById: input.reviewedById,
            reviewedAt: now,
            retryAt:
              input.data.action === "retry" ? input.data.retryAt : undefined,
            scheduledFor:
              input.data.action === "retry" ? input.data.retryAt : undefined,
            lastErrorCode:
              input.data.action === "fail" ? input.data.errorCode : null
          }
        });
        await tx.supervisedReminderReviewEvent.create({
          data: {
            candidateId: candidate.id,
            userId: input.reviewedById,
            result: next.result,
            note: input.data.note,
            errorCode: input.data.errorCode,
            retryAt: input.data.retryAt
          }
        });
        return {
          candidate: updated,
          task: candidate.task,
          consentBlocked: false
        };
      },
      { isolationLevel: "Serializable" }
    )
  );
}

export async function getSupervisedReminderCandidates(input: {
  status?: "pending_review" | "approved" | "blocked" | "dismissed" | "failed";
  take?: number;
} = {}) {
  return withDatabaseError("getSupervisedReminderCandidates", async () =>
    prisma.supervisedReminderCandidate.findMany({
      where: { status: input.status },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            followUpPreference: true,
            consents: currentFollowUpConsent
          }
        },
        ruleVersion: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            rule: { select: { id: true, key: true } }
          }
        },
        task: { select: { id: true } }
      },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
      take: input.take ?? 100
    })
  );
}

export async function getSupervisedReminderSummary() {
  return withDatabaseError("getSupervisedReminderSummary", async () => {
    const grouped = await prisma.supervisedReminderCandidate.groupBy({
      by: ["status"],
      _count: { _all: true }
    });
    return Object.fromEntries(
      grouped.map((row) => [row.status, row._count._all])
    ) as Partial<Record<string, number>>;
  });
}
