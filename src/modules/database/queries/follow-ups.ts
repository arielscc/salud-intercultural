import type { FollowUpAttemptMethod, FollowUpStatus } from "@/generated/prisma/client";
import { dayRange } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";

const closedStatuses: FollowUpStatus[] = [
  "done",
  "improved",
  "not_improved",
  "wants_return",
  "requires_new_visit",
  "requires_doctor_call",
  "cancelled"
];

export async function createFollowUpTaskRecord(input: {
  leadId?: string;
  patientId?: string;
  visitId?: string;
  saleId?: string;
  clinicalOrderId?: string;
  workItemId?: string;
  assignedToId?: string;
  createdById?: string;
  title: string;
  notes?: string;
  dueAt: Date;
}) {
  return withDatabaseError("createFollowUpTaskRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const task = await tx.followUpTask.create({
        data: {
          ...input,
          status: "pending"
        }
      });

      await tx.followUpStatusHistory.create({
        data: {
          taskId: task.id,
          userId: input.createdById,
          toStatus: "pending",
          note: input.notes
        }
      });

      return task;
    });
  });
}

export async function getFollowUpTasks(
  input: PaginationInput & {
    filter?: "overdue" | "today" | "upcoming" | "all";
    status?: FollowUpStatus;
    assignedToId?: string;
  } = {}
) {
  const pagination = getPagination(input);
  const now = new Date();
  const today = dayRange(now);

  return withDatabaseError("getFollowUpTasks", async () => {
    return prisma.followUpTask.findMany({
      where: {
        status: input.status ?? (input.filter === "all" ? undefined : "pending"),
        assignedToId: input.assignedToId,
        dueAt:
          input.filter === "overdue"
            ? { lt: today.start }
            : input.filter === "today" || !input.filter
              ? { gte: today.start, lt: today.end }
              : input.filter === "upcoming"
                ? { gte: today.end }
                : undefined
      },
      include: {
        lead: true,
        patient: true,
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

export async function getFollowUpTaskById(id: string) {
  return withDatabaseError("getFollowUpTaskById", async () => {
    return prisma.followUpTask.findUnique({
      where: { id },
      include: {
        lead: true,
        patient: true,
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
        }
      }
    });
  });
}

export async function createFollowUpAttemptRecord(input: {
  taskId: string;
  userId?: string;
  method: FollowUpAttemptMethod;
  result: FollowUpStatus;
  notes?: string;
  contactedAt?: Date;
}) {
  return withDatabaseError("createFollowUpAttemptRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const task = await tx.followUpTask.findUniqueOrThrow({
        where: { id: input.taskId }
      });
      const completedAt = closedStatuses.includes(input.result) ? input.contactedAt ?? new Date() : null;

      const attempt = await tx.followUpAttempt.create({
        data: {
          taskId: input.taskId,
          userId: input.userId,
          method: input.method,
          result: input.result,
          notes: input.notes,
          contactedAt: input.contactedAt ?? new Date()
        }
      });

      await tx.followUpTask.update({
        where: { id: input.taskId },
        data: {
          status: input.result,
          completedAt
        }
      });

      await tx.followUpStatusHistory.create({
        data: {
          taskId: input.taskId,
          userId: input.userId,
          fromStatus: task.status,
          toStatus: input.result,
          note: input.notes
        }
      });

      return attempt;
    });
  });
}

export async function getFollowUpTimelineForPatient(patientId: string) {
  return withDatabaseError("getFollowUpTimelineForPatient", async () => {
    return prisma.followUpTask.findMany({
      where: { patientId },
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

export async function getFollowUpWorkSummary(userId?: string) {
  return withDatabaseError("getFollowUpWorkSummary", async () => {
    const today = dayRange();
    const whereUser = userId ? { assignedToId: userId } : {};
    const [overdue, todayCount, upcoming] = await Promise.all([
      prisma.followUpTask.count({
        where: {
          ...whereUser,
          status: "pending",
          dueAt: { lt: today.start }
        }
      }),
      prisma.followUpTask.count({
        where: {
          ...whereUser,
          status: "pending",
          dueAt: { gte: today.start, lt: today.end }
        }
      }),
      prisma.followUpTask.count({
        where: {
          ...whereUser,
          status: "pending",
          dueAt: { gte: today.end }
        }
      })
    ]);

    return { overdue, today: todayCount, upcoming };
  });
}
