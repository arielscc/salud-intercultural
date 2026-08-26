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
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";

export type ListInternalLeadsInput = PaginationInput & {
  status?: InternalLeadStatus;
  source?: InternalLeadSource;
  assignedToId?: string;
  search?: string;
};

export type CreateInternalLeadRecordInput = {
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
};

export async function createInternalLeadRecord(input: CreateInternalLeadRecordInput) {
  return withDatabaseError("createInternalLeadRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email,
          city: input.city,
          symptoms: input.symptoms,
          intentionToVisit: input.intentionToVisit,
          estimatedVisitDate: input.estimatedVisitDate,
          commercialNotes: input.commercialNotes,
          source: input.source ?? "website",
          assignedToId: input.assignedToId || input.createdById
        }
      });

      await tx.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          userId: input.createdById,
          toStatus: lead.status,
          note: "Lead creado"
        }
      });

      return lead;
    });
  });
}

export async function getInternalLeads(input: ListInternalLeadsInput = {}) {
  const pagination = getPagination(input);
  const search = input.search?.trim();

  return withDatabaseError("getInternalLeads", async () => {
    return prisma.lead.findMany({
      where: {
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
            email: true,
            role: true
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

export async function getInternalLeadById(id: string) {
  return withDatabaseError("getInternalLeadById", async () => {
    return prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
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
                email: true,
                role: true
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
                email: true,
                role: true
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
                email: true,
                role: true
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
  status: InternalLeadStatus;
  userId?: string;
  note?: string;
}) {
  return withDatabaseError("updateInternalLeadStatus", async () => {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.lead.findUniqueOrThrow({
        where: { id: input.leadId },
        select: { status: true }
      });

      const now = new Date();
      const lead = await tx.lead.update({
        where: { id: input.leadId },
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
  userId?: string;
  method: InternalLeadContactMethod;
  result: InternalLeadContactResult;
  notes?: string;
}) {
  return withDatabaseError("createLeadContactAttempt", async () => {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.leadContactAttempt.create({
        data: input
      });

      await tx.lead.update({
        where: { id: input.leadId },
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
  userId?: string;
  dueAt: Date;
  note?: string;
}) {
  return withDatabaseError("createLeadReminder", async () => {
    return prisma.$transaction(async (tx) => {
      const reminder = await tx.leadReminder.create({
        data: input
      });

      await tx.lead.update({
        where: { id: input.leadId },
        data: {
          status: "reminder_pending"
        }
      });

      await tx.leadStatusHistory.create({
        data: {
          leadId: input.leadId,
          userId: input.userId,
          toStatus: "reminder_pending",
          note: input.note ?? "Recordatorio creado"
        }
      });

      return reminder;
    });
  });
}

export async function getInternalLeadWorkSummary(userId?: string) {
  const now = new Date();

  return withDatabaseError("getInternalLeadWorkSummary", async () => {
    const [newLeads, pendingReminders, noAnswer] = await Promise.all([
      prisma.lead.count({
        where: {
          status: "new",
          assignedToId: userId
        }
      }),
      prisma.leadReminder.count({
        where: {
          status: "pending",
          dueAt: {
            lte: now
          },
          userId
        }
      }),
      prisma.lead.count({
        where: {
          status: "no_answer",
          assignedToId: userId
        }
      })
    ]);

    return { newLeads, pendingReminders, noAnswer };
  });
}
