import type { MetadataRoute } from "next";
import { resolveDeploymentEnvironment } from "@/lib/deployment-environment";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const isProduction = resolveDeploymentEnvironment() === "production";

  return {
    rules: [
      {
        userAgent: "*",
        allow: isProduction ? "/" : undefined,
        disallow: isProduction
          ? ["/admin", "/api", "/_next", "/payload-admin"]
          : "/"
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
