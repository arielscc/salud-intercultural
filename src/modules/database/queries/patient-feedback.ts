import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { canContactPatient } from "@/features/patient-consents/policy";
import {
  classifyPatientFeedback,
  FEEDBACK_QUESTIONNAIRE_VERSION,
  feedbackQuestionnaireSnapshot
} from "@/features/patient-feedback/policy";
import {
  cancelFeedbackRequestSchema,
  createFeedbackRequestSchema,
  submitPatientFeedbackSchema,
  updateFeedbackCaseSchema
} from "@/features/patient-feedback/schema";
import { hashFeedbackAccessToken } from "@/features/patient-feedback/token";
import { resolveDeploymentEnvironment } from "@/lib/deployment-environment";
import { prisma, withDatabaseError } from "@/modules/database";
import type { z } from "zod";

type CreateRequestInput = z.infer<typeof createFeedbackRequestSchema>;
type SubmitFeedbackInput = z.infer<typeof submitPatientFeedbackSchema>;
type UpdateCaseInput = z.infer<typeof updateFeedbackCaseSchema>;
type CancelRequestInput = z.infer<typeof cancelFeedbackRequestSchema>;

const currentFeedbackConsent = {
  where: { purpose: "feedback" as const },
  orderBy: [{ decidedAt: "desc" as const }, { createdAt: "desc" as const }],
  take: 1
};

export class PatientFeedbackError extends Error {
  constructor(
    public readonly code:
      | "ALREADY_SUBMITTED"
      | "CONSENT_REQUIRED"
      | "EXPIRED"
      | "INVALID_OWNER"
      | "INVALID_TOKEN"
      | "NOT_OPEN"
  ) {
    super(code);
    this.name = "PatientFeedbackError";
  }
}

export async function getFeedbackEligibleVisits() {
  const allowTestData = resolveDeploymentEnvironment() !== "production";
  return withDatabaseError("getFeedbackEligibleVisits", () =>
    prisma.visit.findMany({
      where: {
        isTestData: allowTestData ? undefined : false,
        status: { in: ["completed", "left_without_care"] },
        feedbackSubmission: null
      },
      select: {
        id: true,
        checkedInAt: true,
        status: true,
        patient: {
          select: {
            id: true,
            internalCode: true,
            fullName: true,
            consents: currentFeedbackConsent
          }
        },
        feedbackRequests: {
          where: { status: "open" },
          select: { id: true, expiresAt: true },
          take: 1
        }
      },
      orderBy: { checkedInAt: "desc" },
      take: 100
    })
  );
}

export async function getFeedbackOwners() {
  return withDatabaseError("getFeedbackOwners", () =>
    prisma.internalUser.findMany({
      where: { active: true, role: { in: ["direccion", "super_admin"] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }, { email: "asc" }]
    })
  );
}

export async function createPatientFeedbackRequest(input: {
  data: CreateRequestInput;
  createdById: string;
  tokenHash: string;
  now?: Date;
}) {
  return withDatabaseError("createPatientFeedbackRequest", () =>
    prisma.$transaction(
      async (tx) => {
        const now = input.now ?? new Date();
        const [owner, visit] = await Promise.all([
          tx.internalUser.findFirst({
            where: {
              id: input.data.ownerId,
              active: true,
              role: { in: ["direccion", "super_admin"] }
            },
            select: { id: true }
          }),
          tx.visit.findUniqueOrThrow({
            where: { id: input.data.visitId },
            select: {
              id: true,
              patientId: true,
              isTestData: true,
              status: true,
              feedbackSubmission: { select: { id: true } },
              patient: {
                select: { consents: currentFeedbackConsent }
              }
            }
          })
        ]);
        if (!owner) throw new PatientFeedbackError("INVALID_OWNER");
        if (visit.feedbackSubmission) {
          throw new PatientFeedbackError("ALREADY_SUBMITTED");
        }
        if (
          (visit.isTestData && resolveDeploymentEnvironment() === "production") ||
          !["completed", "left_without_care"].includes(visit.status)
        ) {
          throw new PatientFeedbackError("NOT_OPEN");
        }
        if (
          input.data.deliveryChannel === "whatsapp" &&
          !canContactPatient(
            visit.patient.consents[0],
            "feedback",
            "whatsapp"
          )
        ) {
          throw new PatientFeedbackError("CONSENT_REQUIRED");
        }

        const expiresAt = new Date(
          now.getTime() + input.data.expiresInDays * 24 * 60 * 60 * 1000
        );
        const current = await tx.patientFeedbackRequest.findFirst({
          where: { visitId: visit.id, status: "open" },
          select: { id: true }
        });
        if (current) {
          const request = await tx.patientFeedbackRequest.update({
            where: { id: current.id },
            data: {
              ownerId: owner.id,
              createdById: input.createdById,
              tokenHash: input.tokenHash,
              deliveryChannel: input.data.deliveryChannel,
              questionnaireVersion: FEEDBACK_QUESTIONNAIRE_VERSION,
              expiresAt
            }
          });
          return { request, rotated: true };
        }

        const request = await tx.patientFeedbackRequest.create({
          data: {
            patientId: visit.patientId,
            visitId: visit.id,
            ownerId: owner.id,
            createdById: input.createdById,
            tokenHash: input.tokenHash,
            deliveryChannel: input.data.deliveryChannel,
            questionnaireVersion: FEEDBACK_QUESTIONNAIRE_VERSION,
            expiresAt
          }
        });
        return { request, rotated: false };
      },
      { isolationLevel: "Serializable" }
    )
  );
}

export async function getPatientFeedbackForm(token: string) {
  return withDatabaseError("getPatientFeedbackForm", async () => {
    const request = await prisma.patientFeedbackRequest.findUnique({
      where: { tokenHash: hashFeedbackAccessToken(token) },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        questionnaireVersion: true
      }
    });
    if (!request) return { state: "invalid" as const };
    if (request.status === "submitted") return { state: "submitted" as const };
    if (request.status !== "open") return { state: "invalid" as const };
    if (request.expiresAt <= new Date()) return { state: "expired" as const };
    return {
      state: "open" as const,
      questionnaireVersion: request.questionnaireVersion
    };
  });
}

export async function submitPatientFeedback(input: {
  data: SubmitFeedbackInput;
  now?: Date;
}) {
  return withDatabaseError("submitPatientFeedback", () =>
    prisma.$transaction(
      async (tx) => {
        const now = input.now ?? new Date();
        const request = await tx.patientFeedbackRequest.findUnique({
          where: { tokenHash: hashFeedbackAccessToken(input.data.token) },
          select: {
            id: true,
            patientId: true,
            visitId: true,
            ownerId: true,
            status: true,
            expiresAt: true
          }
        });
        if (!request) throw new PatientFeedbackError("INVALID_TOKEN");
        if (request.status === "submitted") {
          throw new PatientFeedbackError("ALREADY_SUBMITTED");
        }
        if (request.status !== "open") {
          throw new PatientFeedbackError("NOT_OPEN");
        }
        if (request.expiresAt <= now) throw new PatientFeedbackError("EXPIRED");

        const triage = classifyPatientFeedback({
          rating: input.data.rating,
          kind: input.data.kind,
          healthRiskFlag: input.data.healthRiskFlag,
          submittedAt: now
        });
        const feedback = await tx.patientFeedback.create({
          data: {
            requestId: request.id,
            patientId: request.patientId,
            visitId: request.visitId,
            rating: input.data.rating,
            kind: input.data.kind,
            area: input.data.area,
            comment: input.data.comment,
            healthRiskFlag: input.data.healthRiskFlag,
            submittedAt: now
          }
        });
        const feedbackCase = await tx.patientFeedbackCase.create({
          data: {
            feedbackId: feedback.id,
            ownerId: request.ownerId,
            classification: triage.classification,
            severity: triage.severity,
            status: triage.status,
            responseDueAt: triage.responseDueAt,
            resolvedAt: triage.resolvedAt
          }
        });
        await tx.patientFeedbackCaseEvent.create({
          data: {
            caseId: feedbackCase.id,
            type: "submitted",
            toStatus: triage.status,
            toClassification: triage.classification,
            toSeverity: triage.severity,
            toOwnerId: request.ownerId,
            responseDueAt: triage.responseDueAt,
            note: `Cuestionario ${feedbackQuestionnaireSnapshot.version}`
          }
        });
        await tx.patientFeedbackRequest.update({
          where: { id: request.id },
          data: { status: "submitted", submittedAt: now }
        });
        await tx.auditEvent.create({
          data: {
            action: "patient_feedback.submit",
            entityType: "patient_feedback",
            entityId: feedback.id,
            result: "success",
            requestId: randomUUID(),
            context: {
              kind: feedback.kind,
              critical: triage.severity === "critical",
              questionnaireVersion: feedbackQuestionnaireSnapshot.version
            } satisfies Prisma.InputJsonObject
          }
        });
        return { feedback, feedbackCase };
      },
      { isolationLevel: "Serializable" }
    )
  );
}

export async function getPatientFeedbackCases(input: {
  status?: "new" | "reviewing" | "awaiting_patient" | "resolved" | "closed";
  severity?: "standard" | "priority" | "critical";
  take?: number;
} = {}) {
  return withDatabaseError("getPatientFeedbackCases", () =>
    prisma.patientFeedbackCase.findMany({
      where: { status: input.status, severity: input.severity },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        feedback: {
          include: {
            patient: {
              select: { id: true, internalCode: true, fullName: true, phone: true }
            },
            visit: { select: { id: true, checkedInAt: true, status: true } }
          }
        },
        events: {
          include: { actor: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: 10
        }
      },
      orderBy: [
        { severity: "desc" },
        { responseDueAt: "asc" },
        { createdAt: "desc" }
      ],
      take: input.take ?? 100
    })
  );
}

export async function getPatientFeedbackDashboard(now = new Date()) {
  return withDatabaseError("getPatientFeedbackDashboard", async () => {
    const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const [cases, feedback] = await Promise.all([
      prisma.patientFeedbackCase.findMany({
        select: { status: true, severity: true, responseDueAt: true }
      }),
      prisma.patientFeedback.findMany({
        where: { submittedAt: { gte: from, lte: now } },
        select: { rating: true, kind: true, area: true }
      })
    ]);
    const open = cases.filter(
      (item) => !["resolved", "closed"].includes(item.status)
    );
    const averageRating = feedback.length
      ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length
      : 0;
    const countBy = <T extends string>(values: T[]) =>
      Object.fromEntries(
        [...new Set(values)].map((value) => [
          value,
          values.filter((candidate) => candidate === value).length
        ])
      ) as Partial<Record<T, number>>;
    return {
      total90Days: feedback.length,
      averageRating,
      open: open.length,
      critical: open.filter((item) => item.severity === "critical").length,
      overdue: open.filter(
        (item) => item.responseDueAt && item.responseDueAt < now
      ).length,
      byKind: countBy(feedback.map((item) => item.kind)),
      byArea: countBy(feedback.map((item) => item.area)),
      byRating: countBy(feedback.map((item) => String(item.rating)))
    };
  });
}

export async function getRecentPatientFeedbackRequests() {
  return withDatabaseError("getRecentPatientFeedbackRequests", () =>
    prisma.patientFeedbackRequest.findMany({
      select: {
        id: true,
        status: true,
        deliveryChannel: true,
        expiresAt: true,
        createdAt: true,
        patient: { select: { internalCode: true, fullName: true } },
        visit: { select: { id: true, checkedInAt: true } },
        owner: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  );
}

export async function updatePatientFeedbackCase(input: {
  data: UpdateCaseInput;
  actorId: string;
}) {
  return withDatabaseError("updatePatientFeedbackCase", () =>
    prisma.$transaction(
      async (tx) => {
        const [current, owner] = await Promise.all([
          tx.patientFeedbackCase.findUniqueOrThrow({
            where: { id: input.data.caseId }
          }),
          tx.internalUser.findFirst({
            where: {
              id: input.data.ownerId,
              active: true,
              role: { in: ["direccion", "super_admin"] }
            },
            select: { id: true }
          })
        ]);
        if (!owner) throw new PatientFeedbackError("INVALID_OWNER");
        const isResolved = ["resolved", "closed"].includes(input.data.status);
        const updated = await tx.patientFeedbackCase.update({
          where: { id: current.id },
          data: {
            ownerId: owner.id,
            classification: input.data.classification,
            severity: input.data.severity,
            status: input.data.status,
            responseDueAt: isResolved ? null : input.data.responseDueAt,
            resolvedAt: isResolved ? current.resolvedAt ?? new Date() : null
          }
        });
        const events: Prisma.PatientFeedbackCaseEventCreateManyInput[] = [];
        if (current.ownerId !== updated.ownerId) {
          events.push({
            caseId: current.id,
            actorId: input.actorId,
            type: "assigned",
            fromOwnerId: current.ownerId,
            toOwnerId: updated.ownerId
          });
        }
        if (
          current.classification !== updated.classification ||
          current.severity !== updated.severity
        ) {
          events.push({
            caseId: current.id,
            actorId: input.actorId,
            type: "classified",
            fromClassification: current.classification,
            toClassification: updated.classification,
            fromSeverity: current.severity,
            toSeverity: updated.severity
          });
        }
        if (current.status !== updated.status) {
          events.push({
            caseId: current.id,
            actorId: input.actorId,
            type: "status_changed",
            fromStatus: current.status,
            toStatus: updated.status
          });
        }
        if (current.responseDueAt?.getTime() !== updated.responseDueAt?.getTime()) {
          events.push({
            caseId: current.id,
            actorId: input.actorId,
            type: "deadline_changed",
            responseDueAt: updated.responseDueAt
          });
        }
        events.push({
          caseId: current.id,
          actorId: input.actorId,
          type: "note",
          note: input.data.note
        });
        await tx.patientFeedbackCaseEvent.createMany({ data: events });
        return updated;
      },
      { isolationLevel: "Serializable" }
    )
  );
}

export async function cancelPatientFeedbackRequest(input: {
  data: CancelRequestInput;
}) {
  return withDatabaseError("cancelPatientFeedbackRequest", async () => {
    const request = await prisma.patientFeedbackRequest.findUniqueOrThrow({
      where: { id: input.data.requestId },
      select: { id: true, status: true }
    });
    if (request.status !== "open") throw new PatientFeedbackError("NOT_OPEN");
    return prisma.patientFeedbackRequest.update({
      where: { id: request.id },
      data: { status: "cancelled", cancelledAt: new Date() }
    });
  });
}
