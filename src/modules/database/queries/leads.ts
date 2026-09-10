import config from "@payload-config";
import { getPayload } from "payload";
import { withDatabaseError } from "@/modules/database/errors";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";

export type LeadSource = "website" | "whatsapp" | "facebook" | "tiktok" | "google" | "call";
export type LeadStatus = "new" | "contacted" | "scheduled" | "closed" | "lost";

export type CreateLeadRecordInput = {
  branchCode: string;
  idempotencyKey: string;
  deduplicationKey: string;
  name?: string;
  phone: string;
  email?: string;
  interest?: string;
  message?: string;
  source?: LeadSource;
  status?: LeadStatus;
  pagePath?: string;
  campaignCode?: string;
  attributedAccount?: string;
  attributionTrafficType?: "unidentified" | "organic" | "paid";
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

export async function createLeadRecord(input: CreateLeadRecordInput) {
  return withDatabaseError("createLeadRecord", async () => {
    const payload = await getPayload({ config });

    const existing = await payload.find({
      collection: "lead-submissions",
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          { branchCode: { equals: input.branchCode } },
          { idempotencyKey: { equals: input.idempotencyKey } }
        ]
      }
    });
    if (existing.docs[0]) return existing.docs[0];

    return payload.create({
      collection: "lead-submissions",
      data: {
        branchCode: input.branchCode,
        idempotencyKey: input.idempotencyKey,
        deduplicationKey: input.deduplicationKey,
        name: input.name,
        phone: input.phone,
        email: input.email,
        interest: input.interest,
        message: input.message,
        source: input.source ?? "website",
        status: input.status ?? "new",
        pagePath: input.pagePath,
        campaignCode: input.campaignCode,
        attributedAccount: input.attributedAccount,
        attributionTrafficType: input.attributionTrafficType,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign
      },
      overrideAccess: true
    });
  });
}

export async function getLeads(
  input: PaginationInput & {
    branchCode: string;
    status?: LeadStatus;
    source?: LeadSource;
    search?: string;
  }
) {
  const pagination = getPagination(input);
  const search = input.search?.trim();

  return withDatabaseError("getLeads", async () => {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "lead-submissions",
      limit: pagination.take,
      page: pagination.page,
      sort: "-createdAt",
      where: {
        and: [
          { branchCode: { equals: input.branchCode } },
          input.status ? { status: { equals: input.status } } : {},
          input.source ? { source: { equals: input.source } } : {},
          search
            ? {
                or: [
                  { name: { contains: search } },
                  { phone: { contains: search } },
                  { email: { contains: search } }
                ]
              }
            : {}
        ]
      },
      overrideAccess: true
    });

    return result.docs;
  });
}

export async function updateLeadStatus(
  id: number | string,
  branchCode: string,
  status: LeadStatus
) {
  return withDatabaseError("updateLeadStatus", async () => {
    const payload = await getPayload({ config });
    const existing = await payload.find({
      collection: "lead-submissions",
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          { id: { equals: id } },
          { branchCode: { equals: branchCode } }
        ]
      }
    });
    if (!existing.docs[0]) throw new Error("LEAD_NOT_FOUND_IN_BRANCH");

    return payload.update({
      id,
      collection: "lead-submissions",
      data: {
        status,
        contactedAt: status === "contacted" ? new Date().toISOString() : undefined
      },
      overrideAccess: true
    });
  });
}
