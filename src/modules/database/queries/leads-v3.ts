/*
 * LEGACY (simplificacion V3.7): sin UI en Sigeco. Los modelos y datos de
 * leads se conservan; estas queries siguen cubiertas por sus tests de
 * integracion hasta definir el destino final de los datos historicos.
 */

import type {
  InternalLeadContactMethod,
  InternalLeadContactResult,
  InternalLeadSource,
  InternalLeadStatus
} from "@/generated/prisma/client";
import { createHash } from "node:crypto";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";

export type ListInternalLeadsInput = PaginationInput & {
  branchCode: string;
  status?: InternalLeadStatus;
  source?: InternalLeadSource;
  assignedToId?: string;
  search?: string;
};

export type CreateInternalLeadRecordInput = {
  branchCode: string;
  name?: string;
  phone: string;
  email?: string;
  city?: string;
  symptoms?: string;
  intentionToVisit?: string;
  estimatedVisitDate?: Date;
  commercialNotes?: string;
  source?: InternalLeadSource;
  assignedToId?: string;
  createdById?: string;
  idempotencyKey?: string;
};

export async function createInternalLeadRecord(input: CreateInternalLeadRecordInput) {
  return withDatabaseError("createInternalLeadRecord", async () => {
    return prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.lead.findUnique({
          where: {
            branchCode_idempotencyKey: {
              branchCode: input.branchCode,
              idempotencyKey: input.idempotencyKey
            }
          }
        });
        if (existing) return existing;
      }
      const assigneeId = input.assignedToId || input.createdById;
      if (assigneeId) {
        const membership = await tx.internalUser.findFirst({
          where: {
            id: assigneeId,
            active: true,
            OR: [
              { platformRole: "super_admin" },
              {
                branchAssignments: {
                  some: { branchCode: input.branchCode, active: true }
                }
              }
            ]
          },
          select: { id: true }
        });
        if (!membership) throw new Error("LEAD_ASSIGNEE_NOT_IN_BRANCH");
      }
      const lead = await tx.lead.create({
        data: {
          branchCode: input.branchCode,
          name: input.name,
          phone: input.phone,
          email: input.email,
          city: input.city,
          symptoms: input.symptoms,
          intentionToVisit: input.intentionToVisit,
          estimatedVisitDate: input.estimatedVisitDate,
          commercialNotes: input.commercialNotes,
          source: input.source ?? "website",
          assignedToId: assigneeId,
          idempotencyKey: input.idempotencyKey,
          deduplicationKey: createHash("sha256")
            .update(`${input.branchCode}\0${input.phone.replace(/\D/g, "")}`)
            .digest("hex")
        }
      });

      await tx.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          branchCode: input.branchCode,
          userId: input.createdById,
          toStatus: lead.status,
          note: "Lead creado"
        }
      });

      return lead;
    });
  });
}

export async function getInternalLeads(input: ListInternalLeadsInput) {
  const pagination = getPagination(input);
  const search = input.search?.trim();

  return withDatabaseError("getInternalLeads", async () => {
    return prisma.lead.findMany({
      where: {
        branchCode: input.branchCode,
        status: input.status,
        source: input.source,
        assignedToId: input.assignedToId,
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } }
            ]
          : undefined
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reminders: {
          where: {
            status: "pending"
          },
          orderBy: {
            dueAt: "asc"
          },
          take: 1
        },
        _count: {
          select: {
            contactAttempts: true,
            reminders: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      skip: pagination.skip,
      take: pagination.take
    });
  });
}

export async function getInternalLeadById(id: string, branchCode: string) {
  return withDatabaseError("getInternalLeadById", async () => {
    return prisma.lead.findFirst({
      where: { id, branchCode },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        contactAttempts: {
          orderBy: {
            contactedAt: "desc"
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        reminders: {
          orderBy: {
            dueAt: "asc"
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        statusHistory: {
          orderBy: {
            createdAt: "desc"
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
  });
}

export async function updateInternalLeadStatus(input: {
  leadId: string;
  branchCode: string;
  status: InternalLeadStatus;
  userId?: string;
  note?: string;
}) {
  return withDatabaseError("updateInternalLeadStatus", async () => {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.lead.findFirstOrThrow({
        where: { id: input.leadId, branchCode: input.branchCode },
        select: { status: true }
      });

      const now = new Date();
      const lead = await tx.lead.update({
        where: { id_branchCode: { id: input.leadId, branchCode: input.branchCode } },
        data: {
          status: input.status,
          firstContactedAt:
            existing.status === "new" && input.status !== "new" ? now : undefined,
          lastContactedAt: input.status !== "new" ? now : undefined
        }
      });

      await tx.leadStatusHistory.create({
        data: {
          leadId: input.leadId,
          branchCode: input.branchCode,
          userId: input.userId,
          fromStatus: existing.status,
          toStatus: input.status,
          note: input.note
        }
      });

      return lead;
    });
  });
}

export async function createLeadContactAttempt(input: {
  leadId: string;
  branchCode: string;
  userId?: string;
  method: InternalLeadContactMethod;
  result: InternalLeadContactResult;
  notes?: string;
}) {
  return withDatabaseError("createLeadContactAttempt", async () => {
    return prisma.$transaction(async (tx) => {
      await tx.lead.findFirstOrThrow({
        where: { id: input.leadId, branchCode: input.branchCode },
        select: { id: true }
      });
      const attempt = await tx.leadContactAttempt.create({
        data: input
      });

      await tx.lead.update({
        where: { id_branchCode: { id: input.leadId, branchCode: input.branchCode } },
        data: {
          lastContactedAt: attempt.contactedAt,
          firstContactedAt: attempt.contactedAt
        }
      });

      return attempt;
    });
  });
}

export async function createLeadReminder(input: {
  leadId: string;
  branchCode: string;
  userId?: string;
  dueAt: Date;
  note?: string;
}) {
  return withDatabaseError("createLeadReminder", async () => {
    return prisma.$transaction(async (tx) => {
      await tx.lead.findFirstOrThrow({
        where: { id: input.leadId, branchCode: input.branchCode },
        select: { id: true }
      });
      const reminder = await tx.leadReminder.create({
        data: input
      });

      await tx.lead.update({
        where: { id_branchCode: { id: input.leadId, branchCode: input.branchCode } },
        data: {
          status: "reminder_pending"
        }
      });

      await tx.leadStatusHistory.create({
        data: {
          leadId: input.leadId,
          branchCode: input.branchCode,
          userId: input.userId,
          toStatus: "reminder_pending",
          note: input.note ?? "Recordatorio creado"
        }
      });

      return reminder;
    });
  });
}

export async function getInternalLeadWorkSummary(branchCode: string, userId?: string) {
  const now = new Date();

  return withDatabaseError("getInternalLeadWorkSummary", async () => {
    const [newLeads, pendingReminders, noAnswer] = await Promise.all([
      prisma.lead.count({
        where: {
          branchCode,
          status: "new",
          assignedToId: userId
        }
      }),
      prisma.leadReminder.count({
        where: {
          branchCode,
          status: "pending",
          dueAt: {
            lte: now
          },
          userId
        }
      }),
      prisma.lead.count({
        where: {
          branchCode,
          status: "no_answer",
          assignedToId: userId
        }
      })
    ]);

    return { newLeads, pendingReminders, noAnswer };
  });
}
