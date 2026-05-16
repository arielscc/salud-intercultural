import type { IconName } from "@/types/landing";
import { featuredTeamMembers } from "@/data/team";

export const aboutContent = {
  seo: {
    title: "Nosotros | Clínica Salud Intercultural en El Alto",
    description:
      "Conoce la historia, misión, visión, valores y filosofía intercultural de la Clínica de Medicina Natural y Tradicional Salud Intercultural en El Alto."
  },
  hero: {
    eyebrow: "Institución",
    title: "Una clínica que une atención humana, medicina natural y sabiduría intercultural",
    description:
      "Salud Intercultural nace para acompañar a las personas con una mirada integral: orientación profesional, terapias complementarias, prevención y respeto por los saberes tradicionales andinos.",
    image:
      "https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "Profesional de salud escuchando a una paciente durante una consulta"
  },
  history: {
    title: "Nuestra historia",
    paragraphs: [
      "La Clínica de Medicina Natural y Tradicional Salud Intercultural está ubicada en El Alto, Bolivia, y trabaja desde una visión cercana a la realidad de las familias alteñas y paceñas.",
      "El proyecto institucional integra orientación médica, terapias naturales y acompañamiento personalizado, cuidando que cada recomendación parta de una evaluación individual y una comunicación responsable.",
      "La V2 del sitio organiza esta información para que pueda administrarse desde el panel sin tocar código, manteniendo una base clara para crecer hacia servicios, testimonios y gestión de pacientes."
    ]
  },
  missionVision: [
    {
      title: "Misión",
      description:
        "Brindar atención integral, humana y responsable mediante medicina natural, tradicional e integrativa, orientando a cada paciente según su contexto, necesidades y evaluación individual.",
      icon: "handHeart"
    },
    {
      title: "Visión",
      description:
        "Ser una clínica referente en salud intercultural en El Alto y La Paz, reconocida por unir conocimiento profesional, prevención, terapias complementarias y respeto por la sabiduría ancestral.",
      icon: "sparkles"
    }
  ] satisfies Array<{ title: string; description: string; icon: IconName }>,
  values: [
    {
      title: "Respeto",
      description: "Atención digna, clara y sin juicios para cada persona.",
      icon: "users"
    },
    {
      title: "Responsabilidad",
      description: "Comunicación prudente, sin promesas absolutas ni reemplazo de una evaluación profesional.",
      icon: "shieldCheck"
    },
    {
      title: "Prevención",
      description: "Orientación enfocada en hábitos, seguimiento y bienestar sostenido.",
      icon: "heartPulse"
    },
    {
      title: "Interculturalidad",
      description: "Unión respetuosa entre saberes modernos, medicina natural y tradición andina.",
      icon: "leaf"
    }
  ] satisfies Array<{ title: string; description: string; icon: IconName }>,
  philosophy: {
    title: "Filosofía intercultural",
    description:
      "Entendemos la salud como equilibrio físico, emocional, social y espiritual. Por eso, nuestro enfoque no separa a la persona de su historia, su familia, sus hábitos ni su cultura.",
    principles: [
      "Escuchar antes de orientar.",
      "Combinar saberes con criterio y responsabilidad.",
      "Acompañar sin generar falsas expectativas.",
      "Promover prevención y decisiones informadas."
    ]
  },
  team: featuredTeamMembers,
  gallery: [
    {
      src: "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=900&q=85",
      alt: "Plantas medicinales como símbolo de medicina natural"
    },
    {
      src: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=85",
      alt: "Profesional revisando información médica"
    },
    {
      src: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=85",
      alt: "Ambiente de atención en salud"
    }
  ],
  cmsNote:
    "Historia, misión, visión, valores, filosofía, equipo y fotografías quedan estructurados como bloques listos para conectarse a Payload CMS."
} as const;
