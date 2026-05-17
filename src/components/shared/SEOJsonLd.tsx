import { getStructuredData } from "@/lib/structured-data";
import type { FAQ, Service } from "@/types/landing";

type SEOJsonLdProps = {
  faqs?: FAQ[];
  services?: Service[];
};

export function SEOJsonLd({ faqs, services }: SEOJsonLdProps) {
  return (
    <>
      {getStructuredData({ faqs, services }).map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
