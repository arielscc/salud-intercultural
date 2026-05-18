import type { Metadata } from "next";

const fallbackSiteUrl = "https://saludintercultural.com";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl).replace(/\/$/, "");

export const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Salud Intercultural";

export const seo = {
  title:
    "Clínica de Medicina Natural y Tradicional en El Alto | Salud Intercultural",
  description:
    "Salud Intercultural es una clínica de medicina natural, tradicional e integrativa en El Alto. Atención personalizada, terapias complementarias, sueroterapia, tratamientos naturales y orientación integral.",
  keywords: [
    "clínica naturista en El Alto",
    "medicina natural en El Alto",
    "medicina tradicional en Bolivia",
    "sueroterapia en El Alto",
    "tratamientos naturales",
    "presión alta",
    "diabetes",
    "gastritis",
    "neuropatía",
    "hígado graso"
  ],
  image: `${siteUrl}/og-salud-intercultural.jpg`
};

export const publicSeoRoutes = [
  {
    path: "/",
    title: seo.title,
    description: seo.description,
    priority: 1
  },
  {
    path: "/nosotros",
    title: "Nosotros | Salud Intercultural",
    description: "Historia, misión, visión y enfoque intercultural de Salud Intercultural.",
    priority: 0.8
  },
  {
    path: "/servicios",
    title: "Servicios de medicina natural e integrativa | Salud Intercultural",
    description: "Servicios principales de Salud Intercultural en El Alto.",
    priority: 0.9
  },
  {
    path: "/tratamientos",
    title: "Tratamientos y orientación general | Salud Intercultural",
    description: "Orientación general sobre problemas frecuentes y evaluación integral.",
    priority: 0.8
  },
  {
    path: "/equipo",
    title: "Equipo médico | Salud Intercultural",
    description: "Equipo profesional de Salud Intercultural.",
    priority: 0.7
  },
  {
    path: "/testimonios",
    title: "Testimonios de pacientes | Salud Intercultural",
    description: "Experiencias de pacientes publicadas con enfoque responsable.",
    priority: 0.7
  },
  {
    path: "/preguntas-frecuentes",
    title: "Preguntas frecuentes | Salud Intercultural",
    description: "Respuestas sobre citas, ubicación, contacto, tratamientos y costos.",
    priority: 0.8
  },
  {
    path: "/contacto",
    title: "Contacto | Salud Intercultural",
    description: "Canales oficiales, dirección, horarios y formulario de Salud Intercultural.",
    priority: 0.9
  },
  {
    path: "/politica-privacidad",
    title: "Politica de privacidad | Salud Intercultural",
    description: "Tratamiento de datos personales y canales de contacto.",
    priority: 0.3
  },
  {
    path: "/terminos-condiciones",
    title: "Terminos y condiciones | Salud Intercultural",
    description: "Condiciones generales de uso del sitio y alcance informativo.",
    priority: 0.3
  }
] as const;

function normalizeSeoText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) {
    return path;
  }

  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createPageMetadata(input: {
  description: string;
  image?: string;
  noIndex?: boolean;
  path: string;
  title: string;
  type?: "article" | "profile" | "website";
}): Metadata {
  const title = normalizeSeoText(input.title, 70);
  const description = normalizeSeoText(input.description, 170);
  const url = absoluteUrl(input.path);
  const image = input.image ?? seo.image;

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      siteName,
      images: [{ url: image, width: 1200, height: 630, alt: siteName }],
      locale: "es_BO",
      type: input.type ?? "website"
    },
    robots: input.noIndex
      ? {
          follow: false,
          index: false
        }
      : undefined,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  };
}
