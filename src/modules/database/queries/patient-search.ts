import type { Prisma } from "@/generated/prisma/client";

export function patientSearchWhere(search?: string): Prisma.PatientWhereInput {
  const terms = search
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  if (!terms?.length) return {};

  return {
    AND: terms.map((term) => ({
      OR: [
        { fullName: { contains: term, mode: "insensitive" as const } },
        { phone: { contains: term, mode: "insensitive" as const } },
        { secondaryPhone: { contains: term, mode: "insensitive" as const } },
        { internalCode: { contains: term, mode: "insensitive" as const } },
        { city: { contains: term, mode: "insensitive" as const } }
      ]
    }))
  };
}

