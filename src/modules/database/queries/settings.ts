import { prisma } from "@/modules/database/client";
import { withDatabaseError } from "@/modules/database/errors";

export async function getSiteSetting<TValue = unknown>(key: string): Promise<TValue | null> {
  const setting = await withDatabaseError("getSiteSetting", () =>
    prisma.siteSetting.findUnique({
      where: { key }
    })
  );

  return setting?.active ? (setting.value as TValue) : null;
}

export async function getActiveSiteSettings() {
  return withDatabaseError("getActiveSiteSettings", () =>
    prisma.siteSetting.findMany({
      where: { active: true },
      orderBy: { key: "asc" }
    })
  );
}
