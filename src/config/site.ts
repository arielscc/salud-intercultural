import { clinic } from "@/data/clinic";

export const siteConfig = {
  name: clinic.shortName,
  legalName: clinic.name,
  slogan: clinic.slogan,
  description:
    "Clínica de medicina natural, tradicional e integrativa en El Alto, con atención humana y orientación personalizada.",
  contact: {
    whatsapp: clinic.whatsapp,
    phone: clinic.phoneSecondary,
    email: clinic.email,
    address: clinic.displayAddress,
    zone: clinic.zone,
    city: clinic.city,
    schedule: clinic.schedule,
    mapsUrl: clinic.mapsUrl
  },
  social: clinic.social,
  primaryCta: {
    label: "Agendar por WhatsApp",
    message: "Hola, quiero agendar una valoración."
  }
} as const;
