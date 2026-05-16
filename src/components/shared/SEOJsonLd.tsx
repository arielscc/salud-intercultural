import { getStructuredData } from "@/lib/structured-data";

export function SEOJsonLd() {
  return (
    <>
      {getStructuredData().map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
