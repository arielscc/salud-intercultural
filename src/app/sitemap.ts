import config from "@payload-config";
import type { MetadataRoute } from "next";
import { getPayload } from "payload";
import { publicSeoRoutes, siteUrl } from "@/lib/seo";

export const revalidate = 3600;

async function getCmsPageRoutes() {
  try {
    const payload = await getPayload({ config });
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
