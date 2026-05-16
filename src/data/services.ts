import type { Service } from "@/types/landing";

export const services: Service[] = [
  {
    slug: "consulta-medica",
    title: "Consulta médica",
    description:
      "Evaluación integral del paciente, orientación terapéutica y seguimiento personalizado.",
    benefits: ["Evaluación individual", "Orientación clara", "Seguimiento"],
    relatedProblems: ["Presión alta", "Diabetes", "Gastritis"],
    whatsappMessage: "Hola, quiero agendar una valoración.",
    icon: "stethoscope"
  },
  {
    slug: "sueroterapia",
    title: "Sueroterapia",
    description:
      "Terapia intravenosa de apoyo nutricional y bienestar general, realizada bajo orientación profesional.",
    benefits: ["Apoyo nutricional", "Bienestar general", "Acompañamiento"],
    relatedProblems: ["Cansancio", "Bienestar metabólico"],
    whatsappMessage: "Hola, quiero consultar por sueroterapia.",
    icon: "droplets"
  },
  {
    slug: "ozonoterapia",
    title: "Ozonoterapia",
    description:
      "Terapia complementaria orientada al bienestar, circulación y apoyo integral.",
    benefits: ["Apoyo integral", "Bienestar circulatorio", "Orientación"],
    relatedProblems: ["Neuropatía", "Circulación"],
    whatsappMessage: "Hola, quiero consultar por ozonoterapia.",
    icon: "sparkles"
  },
  {
    slug: "desintoxicacion-ionica",
    title: "Desintoxicación iónica",
    description:
      "Terapia complementaria enfocada en relajación, bienestar y apoyo al equilibrio corporal.",
    benefits: ["Relajación", "Equilibrio corporal", "Acompañamiento"],
    relatedProblems: ["Estrés", "Bienestar general"],
    whatsappMessage: "Hola, quiero consultar por desintoxicación iónica.",
    icon: "leaf"
  },
  {
    slug: "resonancia-cuantica",
    title: "Resonancia cuántica",
    description:
      "Evaluación complementaria orientativa para conocer mejor el estado general del organismo.",
    benefits: ["Orientación inicial", "Lectura complementaria", "Seguimiento"],
    relatedProblems: ["Chequeo general", "Prevención"],
    whatsappMessage: "Hola, quiero consultar por resonancia cuántica.",
    icon: "activity"
  },
  {
    slug: "limpieza-hepatica",
    title: "Limpieza hepática",
    description:
      "Terapia orientada al bienestar digestivo y hepático, acompañada de orientación personalizada.",
    benefits: ["Bienestar digestivo", "Apoyo hepático", "Hábitos saludables"],
    relatedProblems: ["Hígado graso", "Digestión"],
    whatsappMessage: "Hola, quiero consultar por limpieza hepática.",
    icon: "apple"
  },
  {
    slug: "tratamientos-naturales",
    title: "Tratamientos naturales personalizados",
    description:
      "Planes complementarios personalizados según evaluación, síntomas y necesidades del paciente.",
    benefits: ["Plan individual", "Enfoque natural", "Prevención"],
    relatedProblems: ["Presión alta", "Diabetes", "Gastritis"],
    whatsappMessage: "Hola, quiero información sobre tratamientos naturales.",
    icon: "handHeart"
  }
];
