export const homeContent = {
  hero: {
    eyebrow: ["Atención integral", "Enfoque natural e intercultural", "Ubicados en El Alto"],
    title: "Medicina natural y tradicional para cuidar tu salud de forma integral",
    description:
      "En Salud Intercultural combinamos orientación médica, terapias naturales y sabiduría ancestral andina para acompañarte con una atención humana, preventiva y personalizada.",
    primaryCta: {
      label: "Solicitar valoración por WhatsApp",
      message: "Hola, quiero agendar una valoración."
    },
    secondaryCta: {
      label: "Llamar ahora"
    },
    trustNote: "Cada tratamiento se orienta según una evaluación individual."
  },
  stats: [
    { value: "7+", label: "servicios principales" },
    { value: "6", label: "problemas frecuentes orientados" },
    { value: "2", label: "profesionales base" },
    { value: "100%", label: "orientación personalizada" }
  ],
  featuredServiceSlugs: ["consulta-medica", "sueroterapia", "ozonoterapia"],
  featuredVideo: {
    title: "Contenido audiovisual en preparación",
    description:
      "Espacio listo para videos educativos, orientación preventiva y testimonios autorizados.",
    ctaLabel: "Ver en TikTok"
  },
  editableBlocks: [
    {
      title: "Contenido administrable",
      description:
        "La home queda preparada para reemplazar textos, CTAs, servicios destacados, testimonios y video desde Payload CMS."
    },
    {
      title: "Conversión medible",
      description:
        "Los CTAs y el formulario ya tienen una estructura compatible con eventos de analytics y captación de leads."
    },
    {
      title: "Escalable por secciones",
      description:
        "Cada bloque puede evolucionar hacia componentes CMS sin cambiar la arquitectura pública del sitio."
    }
  ]
} as const;
