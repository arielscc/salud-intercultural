import { prisma } from "@/modules/database/client";
import { withDatabaseError } from "@/modules/database/errors";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import type { LeadSource, LeadStatus } from "@/generated/prisma/client";

export type CreateLeadRecordInput = {
  name?: string;
  phone: string;
  email?: string;
  interest?: string;
  message?: string;
  source?: LeadSource;
  pagePath?: string;
};

export async function createLeadRecord(input: CreateLeadRecordInput) {
  return withDatabaseError("createLeadRecord", () =>
    prisma.lead.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        interest: input.interest,
        message: input.message,
        source: input.source ?? "website",
        pagePath: input.pagePath
      }
    })
  );
}

export async function getLeads(
  input: PaginationInput & {
    status?: LeadStatus;
    source?: LeadSource;
    search?: string;
  } = {}
) {
  const pagination = getPagination(input);
  const search = input.search?.trim();

  return withDatabaseError("getLeads", () =>
    prisma.lead.findMany({
      where: {
        status: input.status,
        source: input.source,
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } }
            ]
          : undefined
      },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take
    })
  );
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  return withDatabaseError("updateLeadStatus", () =>
    prisma.lead.update({
      where: { id },
      data: {
        status,
        contactedAt: status === "contacted" ? new Date() : undefined
      }
    })
  );
}
