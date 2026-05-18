import { getStructuredData } from "@/lib/structured-data";
import type { FAQ, Service } from "@/types/landing";

type SEOJsonLdProps = {
  breadcrumbs?: { name: string; path: string }[];
  faqs?: FAQ[];
  includeBusiness?: boolean;
  includeFaqs?: boolean;
  includeServices?: boolean;
  services?: Service[];
};

export function SEOJsonLd({
  breadcrumbs,
  faqs,
  includeBusiness,
  includeFaqs,
  includeServices,
  services
}: SEOJsonLdProps) {
  return (
    <>
      {getStructuredData({
        breadcrumbs,
        faqs,
        includeBusiness,
        includeFaqs,
        includeServices,
        services
      }).map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
