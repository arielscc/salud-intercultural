import { prisma } from "@/modules/database/client";
import { withDatabaseError } from "@/modules/database/errors";
import { getOrderBy, getPagination, type PaginationInput } from "@/modules/database/pagination";

export async function getPublicServices(input?: PaginationInput) {
  const pagination = getPagination(input);

  return withDatabaseError("getPublicServices", () =>
    prisma.service.findMany({
      where: { active: true },
      orderBy: [getOrderBy("order"), getOrderBy("title")],
      skip: pagination.skip,
      take: pagination.take
    })
  );
}

export async function getFeaturedServices(limit = 6) {
  return withDatabaseError("getFeaturedServices", () =>
    prisma.service.findMany({
      where: { active: true, featured: true },
      orderBy: [getOrderBy("order"), getOrderBy("title")],
      take: limit
    })
  );
}

export async function getPublicTreatmentTopics(input?: PaginationInput) {
  const pagination = getPagination(input);

  return withDatabaseError("getPublicTreatmentTopics", () =>
    prisma.treatmentTopic.findMany({
      where: { active: true },
      orderBy: [getOrderBy("order"), getOrderBy("title")],
      skip: pagination.skip,
      take: pagination.take
    })
  );
}

export async function getPublicTeamMembers(input?: PaginationInput) {
  const pagination = getPagination(input);

  return withDatabaseError("getPublicTeamMembers", () =>
    prisma.teamMember.findMany({
      where: { active: true },
      orderBy: [getOrderBy("order"), getOrderBy("name")],
      skip: pagination.skip,
      take: pagination.take
    })
  );
}

export async function getFeaturedTeamMembers(limit = 4) {
  return withDatabaseError("getFeaturedTeamMembers", () =>
    prisma.teamMember.findMany({
      where: { active: true, featured: true },
      orderBy: [getOrderBy("order"), getOrderBy("name")],
      take: limit
    })
  );
}

export async function getPublicTestimonials(input?: PaginationInput) {
  const pagination = getPagination(input);

  return withDatabaseError("getPublicTestimonials", () =>
    prisma.testimonial.findMany({
      where: { active: true },
      orderBy: [getOrderBy("order"), { publishedAt: "desc" }],
      skip: pagination.skip,
      take: pagination.take
    })
  );
}

export async function getFeaturedTestimonials(limit = 3) {
  return withDatabaseError("getFeaturedTestimonials", () =>
    prisma.testimonial.findMany({
      where: { active: true, featured: true },
      orderBy: [getOrderBy("order"), { publishedAt: "desc" }],
      take: limit
    })
  );
}

export async function getPublicFaqs(input?: PaginationInput) {
  const pagination = getPagination(input);

  return withDatabaseError("getPublicFaqs", () =>
    prisma.faq.findMany({
      where: { active: true },
      orderBy: [getOrderBy("order"), getOrderBy("question")],
      skip: pagination.skip,
      take: pagination.take
    })
  );
}

export async function getFeaturedFaqs(limit = 5) {
  return withDatabaseError("getFeaturedFaqs", () =>
    prisma.faq.findMany({
      where: { active: true, featured: true },
      orderBy: [getOrderBy("order"), getOrderBy("question")],
      take: limit
    })
  );
}
