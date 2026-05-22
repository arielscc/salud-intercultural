import type { MetadataRoute } from "next";
import { getPayloadClient } from "@/lib/cms/public-content";
import { publicSeoRoutes, siteUrl } from "@/lib/seo";

export const revalidate = 3600;

async function getCmsPageRoutes() {
  if (
    process.env.NEXT_PHASE === "phase-production-build" &&
    process.env.CMS_READS_DURING_BUILD !== "true"
  ) {
    return [];
  }

  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "pages",
      depth: 0,
      limit: 100,
      overrideAccess: false,
      where: {
        active: {
          equals: true
        }
      }
    });

    return result.docs
      .map((page) => (page.slug === "home" ? "/" : `/${page.slug}`))
      .filter((path) => publicSeoRoutes.some((route) => route.path === path));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cmsRoutes = await getCmsPageRoutes();
  const routePaths = new Set([...publicSeoRoutes.map((route) => route.path), ...cmsRoutes]);
  const now = new Date();

  return [...routePaths].map((path) => {
    const route = publicSeoRoutes.find((item) => item.path === path);

    return {
      url: `${siteUrl}${path === "/" ? "" : path}`,
      lastModified: now,
      changeFrequency: path === "/" ? "weekly" : "monthly",
      priority: route?.priority ?? 0.6
    };
  });
}
