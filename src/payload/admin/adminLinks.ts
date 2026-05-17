export const adminResourceLinks = [
  {
    label: "Leads",
    description: "Consultas recibidas desde el sitio publico.",
    href: "/admin/collections/lead-submissions",
    slug: "lead-submissions"
  },
  {
    label: "Servicios",
    description: "Servicios y terapias visibles en el sitio.",
    href: "/admin/collections/services",
    slug: "services"
  },
  {
    label: "Testimonios",
    description: "Experiencias publicadas con privacidad.",
    href: "/admin/collections/testimonials",
    slug: "testimonials"
  },
  {
    label: "FAQs",
    description: "Preguntas frecuentes por categoria.",
    href: "/admin/collections/faqs",
    slug: "faqs"
  },
  {
    label: "Equipo",
    description: "Perfiles profesionales activos e inactivos.",
    href: "/admin/collections/team-members",
    slug: "team-members"
  },
  {
    label: "Configuracion",
    description: "Marca, contacto, conversion y redes.",
    href: "/admin/globals/site-settings",
    slug: "site-settings"
  }
] as const;

export type AdminResourceSlug = (typeof adminResourceLinks)[number]["slug"];
