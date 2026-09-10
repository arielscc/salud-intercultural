import type {
  FollowUpAttemptMethod,
  FollowUpPriority,
  FollowUpResult,
  FollowUpStatus,
  FollowUpType,
  InternalRole,
  Prisma
} from "@/generated/prisma/client";
import {
  canRoleWorkFollowUpType,
  followUpDomainByType,
  followUpResultCreatesDoctorCall,
  followUpResultKeepsTaskOpen,
  followUpResultsByType
} from "@/features/follow-ups/policy";
import { dayRange } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";

type FollowUpLifecycleStatus = Extract<
  FollowUpStatus,
  "pending" | "done" | "cancelled"
>;

export class PatientFollowUpConsentRequiredError extends Error {
  constructor() {
    super("PATIENT_FOLLOW_UP_CONSENT_REQUIRED");
    this.name = "PatientFollowUpConsentRequiredError";
  }
}

export class FollowUpWorkflowError extends Error {
  constructor(
    public readonly code:
      | "TASK_ALREADY_CLOSED"
      | "RESULT_NOT_ALLOWED"
      | "ROLE_NOT_ALLOWED"
      | "BRANCH_MISMATCH"
      | "NEXT_DUE_AT_REQUIRED"
  ) {
    super(code);
    this.name = "FollowUpWorkflowError";
  }
}

function currentFollowUpConsent(branchCode: string) {
  return {
    where: { purpose: "follow_up" as const, branchCode },
    orderBy: [{ decidedAt: "desc" as const }, { createdAt: "desc" as const }],
    take: 1
  };
}

function followUpVisibilityWhere(role?: InternalRole): Prisma.FollowUpTaskWhereInput {
  if (!role || role === "super_admin" || role === "direccion") return {};
  if (role === "administracion") {
    return { domain: "administrative" };
  }
  if (role === "medico") return { domain: "clinical" };
  if (role === "recepcion") return { type: { not: "doctor_call" } };
  return { id: "__no_follow_up_access__" };
}

async function resolveFollowUpAssignee(
  tx: Prisma.TransactionClient,
  input: {
    branchCode: string;
    type: FollowUpType;
    requestedAssigneeId?: string;
    createdById?: string;
  }
) {
  if (input.type === "doctor_call") {
    const doctor = await tx.internalUser.findFirst({
      where: {
        active: true,
        branchAssignments: {
          some: { branchCode: input.branchCode, active: true, role: "medico" }
        }
      },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }]
    });
    return doctor?.id;
  }

  if (followUpDomainByType[input.type] === "clinical") {
    const marlen = await tx.internalUser.findFirst({
      where: {
        active: true,
        branchAssignments: {
          some: { branchCode: input.branchCode, active: true, role: "recepcion" }
        },
        name: { contains: "Marlen", mode: "insensitive" }
      },
      orderBy: { createdAt: "asc" }
    });
    return marlen?.id;
  }

  const requestedId = input.requestedAssigneeId ?? input.createdById;
  if (!requestedId) return undefined;
  const requested = await tx.internalUser.findFirst({
    where: {
      id: requestedId,
      active: true,
      branchAssignments: {
        some: {
          branchCode: input.branchCode,
          active: true,
          role: { in: ["recepcion", "administracion"] }
        }
      }
    },
    select: { id: true }
  });
  return requested?.id;
}

export async function createFollowUpTaskRecord(input: {
  branchCode: string;
  leadId?: string;
  patientId?: string;
  visitId?: string;
  saleId?: string;
  clinicalOrderId?: string;
  workItemId?: string;
  assignedToId?: string;
  createdById?: string;
  type?: FollowUpType;
  priority?: FollowUpPriority;
  title: string;
  notes?: string;
  dueAt: Date;
  /** Estado inicial. Por defecto `pending`; `awaiting_payment` para los que el
   * médico agenda y se activan al pagar el tratamiento. */
  status?: FollowUpStatus;
}) {
  return withDatabaseError("createFollowUpTaskRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const type = input.type ?? "administrative";
      const initialStatus = input.status ?? "pending";
      const assignedToId = await resolveFollowUpAssignee(tx, {
        branchCode: input.branchCode,
        type,
        requestedAssigneeId: input.assignedToId,
        createdById: input.createdById
      });
      const priority =
        type === "doctor_call" &&
        (!input.priority ||
          input.priority === "low" ||
          input.priority === "normal")
          ? "high"
          : (input.priority ?? "normal");
      const [visitMatches, saleMatches, orderMatches, workItemMatches] =
        await Promise.all([
          input.visitId
            ? tx.visit.count({
                where: { id: input.visitId, branchCode: input.branchCode }
              })
            : 1,
          input.saleId
            ? tx.sale.count({
                where: { id: input.saleId, branchCode: input.branchCode }
              })
            : 1,
          input.clinicalOrderId
            ? tx.clinicalOrder.count({
                where: {
                  id: input.clinicalOrderId,
                  visit: { branchCode: input.branchCode }
                }
              })
            : 1,
          input.workItemId
            ? tx.visitWorkItem.count({
                where: {
                  id: input.workItemId,
                  branchCode: input.branchCode,
                  visit: { branchCode: input.branchCode }
                }
              })
            : 1
        ]);
      if (
        ![visitMatches, saleMatches, orderMatches, workItemMatches].every(Boolean)
      ) {
        throw new FollowUpWorkflowError("BRANCH_MISMATCH");
      }
      const task = await tx.followUpTask.create({
        data: {
          ...input,
          assignedToId,
          type,
          domain: followUpDomainByType[type],
          priority,
          status: initialStatus
        }
      });

      await tx.followUpStatusHistory.create({
        data: {
          taskId: task.id,
          userId: input.createdById,
          toStatus: initialStatus,
          note: input.notes
        }
      });

      return task;
    });
  });
}

export type FollowUpTaskFilters = {
  branchCode: string;
  filter?: "overdue" | "today" | "upcoming" | "all";
  status?: FollowUpLifecycleStatus;
  assignedToId?: string;
  unassigned?: boolean;
  type?: FollowUpType;
  priority?: FollowUpPriority;
  viewerRole?: InternalRole;
};

function buildFollowUpTaskWhere(
  input: FollowUpTaskFilters
): Prisma.FollowUpTaskWhereInput {
  const today = dayRange();
  return {
    branchCode: input.branchCode,
    ...followUpVisibilityWhere(input.viewerRole),
    // Los que esperan pago no entran a la bandeja hasta activarse al cobrar.
    status:
      input.status ??
      (input.filter === "all" ? { not: "awaiting_payment" } : "pending"),
    assignedToId: input.unassigned ? null : input.assignedToId,
    type: input.type,
    priority: input.priority,
    dueAt:
      input.filter === "overdue"
        ? { lt: today.start }
        : input.filter === "today" || !input.filter
          ? { gte: today.start, lt: today.end }
          : input.filter === "upcoming"
            ? { gte: today.end }
            : undefined
  };
}

export async function getFollowUpTasks(
  input: PaginationInput & FollowUpTaskFilters
) {
  const pagination = getPagination(input);

  return withDatabaseError("getFollowUpTasks", async () => {
    return prisma.followUpTask.findMany({
      where: buildFollowUpTaskWhere(input),
      include: {
        lead: true,
        patient: {
          include: {
            consents: currentFollowUpConsent(input.branchCode)
          }
        },
        visit: true,
        sale: true,
        assignedTo: true,
        createdBy: true,
        attempts: {
          orderBy: { contactedAt: "desc" },
          take: 1
        }
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      skip: pagination.skip,
      take: pagination.take
    });
  });
}

export async function getFollowUpTaskCount(
  input: FollowUpTaskFilters
) {
  return withDatabaseError("getFollowUpTaskCount", async () => {
    return prisma.followUpTask.count({
      where: buildFollowUpTaskWhere(input)
    });
  });
}

export async function getFollowUpTaskById(
  id: string,
  branchCode: string,
  viewerRole?: InternalRole
) {
  return withDatabaseError("getFollowUpTaskById", async () => {
    return prisma.followUpTask.findFirst({
      where: { id, branchCode, ...followUpVisibilityWhere(viewerRole) },
      include: {
        lead: true,
        patient: {
          include: {
            consents: currentFollowUpConsent(branchCode)
          }
        },
        visit: true,
        sale: true,
        assignedTo: true,
        createdBy: true,
        attempts: {
          include: { user: true },
          orderBy: { contactedAt: "desc" }
        },
        statusHistory: {
          include: { user: true },
          orderBy: { createdAt: "desc" }
        },
        escalatedFromTask: {
          select: { id: true, title: true, type: true, result: true }
        },
        escalatedToTask: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            assignedTo: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
  });
}

export async function createFollowUpAttemptRecord(input: {
  taskId: string;
  branchCode: string;
  userId?: string;
  method: FollowUpAttemptMethod;
  result: FollowUpResult;
  notes?: string;
  contactedAt?: Date;
  nextDueAt?: Date;
}) {
  return withDatabaseError("createFollowUpAttemptRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const task = await tx.followUpTask.findFirstOrThrow({
        where: { id: input.taskId, branchCode: input.branchCode },
        include: {
          patient: {
            include: {
              consents: currentFollowUpConsent(input.branchCode)
            }
          },
          assignedTo: true
        }
      });

      if (task.status !== "pending") {
        throw new FollowUpWorkflowError("TASK_ALREADY_CLOSED");
      }
      if (!followUpResultsByType[task.type].includes(input.result)) {
        throw new FollowUpWorkflowError("RESULT_NOT_ALLOWED");
      }

      const actor = input.userId
        ? await tx.internalUser.findUnique({
            where: { id: input.userId },
            select: {
              platformRole: true,
              branchAssignments: {
                where: { branchCode: task.branchCode, active: true },
                select: { role: true },
                take: 1
              }
            }
          })
        : null;
      const actorRole =
        actor?.platformRole === "super_admin"
          ? "super_admin"
          : actor?.branchAssignments[0]?.role;
      if (!actorRole || !canRoleWorkFollowUpType(actorRole, task.type)) {
        throw new FollowUpWorkflowError("ROLE_NOT_ALLOWED");
      }
      if (
        followUpResultKeepsTaskOpen(input.result) &&
        !input.nextDueAt
      ) {
        throw new FollowUpWorkflowError("NEXT_DUE_AT_REQUIRED");
      }

      if (task.patient && input.method !== "in_person") {
        const consent = task.patient.consents[0];
        const allowed =
          consent?.decision === "granted" &&
          (input.method === "call"
            ? consent.contactChannels.includes("call")
            : input.method === "whatsapp"
              ? consent.contactChannels.includes("whatsapp")
              : consent.contactChannels.length > 0);

        if (!allowed) {
          throw new PatientFollowUpConsentRequiredError();
        }
      }
      const contactedAt = input.contactedAt ?? new Date();
      const remainsPending = followUpResultKeepsTaskOpen(input.result);
      const nextStatus: FollowUpLifecycleStatus = remainsPending
        ? "pending"
        : input.result === "cancelled"
          ? "cancelled"
          : "done";
      const completedAt = remainsPending ? null : contactedAt;

      const attempt = await tx.followUpAttempt.create({
        data: {
          taskId: input.taskId,
          userId: input.userId,
          method: input.method,
          result: input.result,
          notes: input.notes,
          contactedAt
        }
      });

      await tx.followUpTask.update({
        where: { id: input.taskId },
        data: {
          result: input.result,
          status: nextStatus,
          completedAt,
          dueAt: remainsPending ? input.nextDueAt : undefined
        }
      });

      await tx.followUpStatusHistory.create({
        data: {
          taskId: input.taskId,
          userId: input.userId,
          fromStatus: task.status,
          toStatus: nextStatus,
          note: input.notes
        }
      });

      let escalatedTask = null;
      if (
        task.type !== "doctor_call" &&
        followUpResultCreatesDoctorCall(input.result)
      ) {
        const assignedToId = await resolveFollowUpAssignee(tx, {
          branchCode: task.branchCode,
          type: "doctor_call",
          createdById: input.userId
        });
        escalatedTask = await tx.followUpTask.create({
          data: {
            branchCode: task.branchCode,
            patientId: task.patientId,
            visitId: task.visitId,
            saleId: task.saleId,
            clinicalOrderId: task.clinicalOrderId,
            workItemId: task.workItemId,
            assignedToId,
            createdById: input.userId,
            escalatedFromTaskId: task.id,
            type: "doctor_call",
            domain: "clinical",
            priority: "urgent",
            status: "pending",
            title: `Llamada médica — ${task.title}`,
            notes:
              input.notes ??
              "El seguimiento requiere valoración o respuesta del médico.",
            dueAt: input.nextDueAt ?? contactedAt
          }
        });
        await tx.followUpStatusHistory.create({
          data: {
            taskId: escalatedTask.id,
            userId: input.userId,
            toStatus: "pending",
            note: "Escalado para llamada médica."
          }
        });
      }

      return { attempt, escalatedTask };
    });
  });
}

export async function getFollowUpTimelineForPatient(patientId: string, branchCode: string) {
  return withDatabaseError("getFollowUpTimelineForPatient", async () => {
    return prisma.followUpTask.findMany({
      where: { patientId, branchCode },
      include: {
        assignedTo: true,
        attempts: {
          include: { user: true },
          orderBy: { contactedAt: "desc" }
        }
      },
      orderBy: [{ dueAt: "desc" }, { createdAt: "desc" }],
      take: 12
    });
  });
}

export async function getFollowUpWorkSummary(
  branchCode: string,
  userId?: string,
  viewerRole?: InternalRole
) {
  return withDatabaseError("getFollowUpWorkSummary", async () => {
    const today = dayRange();
    const whereUser = userId ? { assignedToId: userId } : {};
    const visibility = followUpVisibilityWhere(viewerRole);
    const [overdue, todayCount, upcoming] = await Promise.all([
      prisma.followUpTask.count({
        where: {
          branchCode,
          ...whereUser,
          ...visibility,
          status: "pending",
          dueAt: { lt: today.start }
        }
      }),
      prisma.followUpTask.count({
        where: {
          branchCode,
          ...whereUser,
          ...visibility,
          status: "pending",
          dueAt: { gte: today.start, lt: today.end }
        }
      }),
      prisma.followUpTask.count({
        where: {
          branchCode,
          ...whereUser,
          ...visibility,
          status: "pending",
          dueAt: { gte: today.end }
        }
      })
    ]);

    return { overdue, today: todayCount, upcoming };
  });
}

export async function getFollowUpAssignees(branchCode: string, viewerRole?: InternalRole) {
  return withDatabaseError("getFollowUpAssignees", async () => {
    const roles: InternalRole[] =
      viewerRole === "administracion"
        ? ["administracion"]
        : viewerRole === "medico"
          ? ["medico"]
          : ["recepcion", "administracion", "medico"];
    const users = await prisma.internalUser.findMany({
      where: {
        active: true,
        OR: [
          ...(viewerRole === "administracion" || viewerRole === "medico"
            ? []
            : [{ platformRole: "super_admin" as const }]),
          { branchAssignments: { some: { branchCode, active: true, role: { in: roles } } } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        branchAssignments: {
          where: { branchCode, active: true },
          select: { role: true },
          take: 1
        }
      },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role:
        user.platformRole === "super_admin"
          ? ("super_admin" as const)
          : user.branchAssignments[0].role
    }));
  });
}
