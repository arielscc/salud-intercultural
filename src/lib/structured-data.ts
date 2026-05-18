import { clinic } from "@/data/clinic";
import { activeFaqs } from "@/data/faqs";
import { services } from "@/data/services";
import { absoluteUrl, siteName, siteUrl } from "@/lib/seo";
import type { FAQ, Service } from "@/types/landing";

type BreadcrumbItem = {
  name: string;
  path: string;
};

type StructuredDataInput = {
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQ[];
  includeBusiness?: boolean;
  includeFaqs?: boolean;
  includeServices?: boolean;
  services?: Service[];
};

export function getStructuredData(input: StructuredDataInput = {}) {
  const publicFaqs = input.faqs ?? activeFaqs;
  const publicServices = input.services ?? services;
  const breadcrumbs = input.breadcrumbs ?? [{ name: "Inicio", path: "/" }];

  const organization = {
    "@context": "https://schema.org",
    "@type": ["MedicalClinic", "MedicalBusiness", "LocalBusiness", "Organization"],
    name: "Clínica de Medicina Natural y Tradicional Salud Intercultural",
    alternateName: clinic.shortName,
    url: siteUrl,
    logo: `${siteUrl}/og-salud-intercultural.jpg`,
    image: `${siteUrl}/og-salud-intercultural.jpg`,
    telephone: clinic.whatsapp,
    email: clinic.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: clinic.address,
      addressLocality: clinic.city,
      addressRegion: "La Paz",
      addressCountry: "BO"
    },
    areaServed: ["El Alto", "La Paz", "Bolivia"],
    openingHours: "Mo-Sa 09:00-18:00",
    sameAs: [clinic.social.facebook, clinic.social.tiktok],
    medicalSpecialty: [
      "Medicina natural",
      "Medicina tradicional",
      "Terapias complementarias"
    ],
    priceRange: "$$"
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: publicFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };

  const serviceGraph = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: publicServices.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: service.title,
        description: service.description,
        url: absoluteUrl("/servicios"),
        provider: {
          "@type": "MedicalClinic",
          name: clinic.shortName
        },
        areaServed: "El Alto, La Paz, Bolivia"
      }
    }))
  };

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path)
      }))
  };

  return [
    input.includeBusiness === false ? null : organization,
    input.includeFaqs === false ? null : faqPage,
    input.includeServices === false ? null : serviceGraph,
    breadcrumbList,
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
      inLanguage: "es-BO"
    }
  ].filter(Boolean);
}
