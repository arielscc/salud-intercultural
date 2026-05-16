import type { Testimonial } from "@/types/landing";

export const testimonials: Testimonial[] = [
  {
    id: "paciente-el-alto-atencion-integral",
    quote:
      "Me atendieron con paciencia y me explicaron cada paso del tratamiento.",
    author: "Paciente de El Alto",
    treatmentType: "Consulta integral y orientación natural",
    rating: 5,
    date: "2026-02-12",
    active: true,
    featured: true,
    order: 1,
    privacyNotice: "Identidad reservada por privacidad del paciente."
  },
  {
    id: "paciente-la-paz-atencion-humana",
    quote: "Sentí una atención más humana y personalizada.",
    author: "Paciente de La Paz",
    treatmentType: "Acompañamiento terapéutico complementario",
    rating: 5,
    date: "2026-01-24",
    active: true,
    featured: true,
    order: 2,
    privacyNotice: "Testimonio publicado sin datos clínicos sensibles."
  },
  {
    id: "paciente-clinica-whatsapp",
    quote:
      "Me orientaron de forma clara y pude consultar mis dudas por WhatsApp.",
    author: "Paciente de la clínica",
    treatmentType: "Orientación y seguimiento por consulta",
    rating: 5,
    date: "2025-12-18",
    active: true,
    featured: true,
    order: 3,
    privacyNotice: "Nombre no visible por solicitud de confidencialidad."
  },
  {
    id: "testimonio-futuro-video",
    quote:
      "Espacio preparado para incorporar testimonios en video o con fotografía cuando exista autorización expresa.",
    author: "Testimonio futuro",
    treatmentType: "Formato administrable desde CMS",
    rating: 4,
    active: false,
    featured: false,
    order: 99,
    privacyNotice: "Registro inactivo de ejemplo para validar administración."
  }
];

export const activeTestimonials = testimonials
  .filter((testimonial) => testimonial.active)
  .sort((a, b) => a.order - b.order);

export const featuredTestimonials = activeTestimonials.filter(
  (testimonial) => testimonial.featured
);
