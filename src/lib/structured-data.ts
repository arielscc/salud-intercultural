import { clinic } from "@/data/clinic";
import { activeFaqs } from "@/data/faqs";
import { services } from "@/data/services";
import { siteUrl } from "@/lib/seo";
import type { FAQ, Service } from "@/types/landing";

type StructuredDataInput = {
  faqs?: FAQ[];
  services?: Service[];
};

export function getStructuredData(input: StructuredDataInput = {}) {
  const publicFaqs = input.faqs ?? activeFaqs;
  const publicServices = input.services ?? services;

  const organization = {
    "@context": "https://schema.org",
    "@type": ["MedicalBusiness", "LocalBusiness", "Organization"],
    name: "Clínica de Medicina Natural y Tradicional Salud Intercultural",
    alternateName: clinic.shortName,
    url: siteUrl,
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
    ]
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
        provider: {
          "@type": "MedicalBusiness",
          name: clinic.shortName
        },
        areaServed: "El Alto, La Paz, Bolivia"
      }
    }))
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: siteUrl
      }
    ]
  };

  return [organization, faqPage, serviceGraph, breadcrumbs];
}
