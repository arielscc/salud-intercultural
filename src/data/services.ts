import type { Service } from "@/types/landing";

export const services: Service[] = [
  {
    slug: "consulta-medica",
    image:
      "https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Consulta médica con atención personalizada",
    title: "Consulta médica",
    description:
      "Evaluación integral del paciente, orientación terapéutica y seguimiento personalizado.",
    benefits: ["Evaluación individual", "Orientación clara", "Seguimiento"],
    relatedProblems: ["Presión alta", "Diabetes", "Gastritis"],
    whatsappMessage: "Hola, quiero agendar una valoración.",
    icon: "stethoscope",
    active: true,
    featured: true,
    seo: {
      title: "Consulta médica integral en El Alto | Salud Intercultural",
      description:
        "Consulta médica con evaluación integral, orientación terapéutica y seguimiento personalizado en Salud Intercultural."
    }
  },
  {
    slug: "sueroterapia",
    image:
      "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Terapia intravenosa de apoyo nutricional",
    title: "Sueroterapia",
    description:
      "Terapia intravenosa de apoyo nutricional y bienestar general, realizada bajo orientación profesional.",
    benefits: ["Apoyo nutricional", "Bienestar general", "Acompañamiento"],
    relatedProblems: ["Cansancio", "Bienestar metabólico"],
    whatsappMessage: "Hola, quiero consultar por sueroterapia.",
    icon: "droplets",
    active: true,
    featured: true,
    seo: {
      title: "Sueroterapia en El Alto | Salud Intercultural",
      description:
        "Sueroterapia de apoyo nutricional y bienestar general con orientación profesional en El Alto."
    }
  },
  {
    slug: "ozonoterapia",
    image:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Atención complementaria orientada al bienestar",
    title: "Ozonoterapia",
    description:
      "Terapia complementaria orientada al bienestar, circulación y apoyo integral.",
    benefits: ["Apoyo integral", "Bienestar circulatorio", "Orientación"],
    relatedProblems: ["Neuropatía", "Circulación"],
    whatsappMessage: "Hola, quiero consultar por ozonoterapia.",
    icon: "sparkles",
    active: true,
    featured: true,
    seo: {
      title: "Ozonoterapia complementaria en El Alto | Salud Intercultural",
      description:
        "Ozonoterapia complementaria orientada al bienestar, circulación y apoyo integral según evaluación."
    }
  },
  {
    slug: "desintoxicacion-ionica",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Terapia de relajación y bienestar corporal",
    title: "Desintoxicación iónica",
    description:
      "Terapia complementaria enfocada en relajación, bienestar y apoyo al equilibrio corporal.",
    benefits: ["Relajación", "Equilibrio corporal", "Acompañamiento"],
    relatedProblems: ["Estrés", "Bienestar general"],
    whatsappMessage: "Hola, quiero consultar por desintoxicación iónica.",
    icon: "leaf",
    active: true,
    featured: false,
    seo: {
      title: "Desintoxicación iónica en El Alto | Salud Intercultural",
      description:
        "Terapia complementaria de desintoxicación iónica enfocada en relajación y bienestar corporal."
    }
  },
  {
    slug: "resonancia-cuantica",
    image:
      "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Evaluación complementaria orientativa",
    title: "Resonancia cuántica",
    description:
      "Evaluación complementaria orientativa para conocer mejor el estado general del organismo.",
    benefits: ["Orientación inicial", "Lectura complementaria", "Seguimiento"],
    relatedProblems: ["Chequeo general", "Prevención"],
    whatsappMessage: "Hola, quiero consultar por resonancia cuántica.",
    icon: "activity",
    active: true,
    featured: false,
    seo: {
      title: "Resonancia cuántica orientativa | Salud Intercultural",
      description:
        "Evaluación complementaria orientativa para conocer mejor el estado general del organismo."
    }
  },
  {
    slug: "limpieza-hepatica",
    image:
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Alimentos naturales vinculados al bienestar digestivo",
    title: "Limpieza hepática",
    description:
      "Terapia orientada al bienestar digestivo y hepático, acompañada de orientación personalizada.",
    benefits: ["Bienestar digestivo", "Apoyo hepático", "Hábitos saludables"],
    relatedProblems: ["Hígado graso", "Digestión"],
    whatsappMessage: "Hola, quiero consultar por limpieza hepática.",
    icon: "apple",
    active: true,
    featured: false,
    seo: {
      title: "Limpieza hepática y bienestar digestivo | Salud Intercultural",
      description:
        "Terapia orientada al bienestar digestivo y hepático, acompañada de orientación personalizada."
    }
  },
  {
    slug: "tratamientos-naturales",
    image:
      "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Plantas medicinales para tratamientos naturales personalizados",
    title: "Tratamientos naturales personalizados",
    description:
      "Planes complementarios personalizados según evaluación, síntomas y necesidades del paciente.",
    benefits: ["Plan individual", "Enfoque natural", "Prevención"],
    relatedProblems: ["Presión alta", "Diabetes", "Gastritis"],
    whatsappMessage: "Hola, quiero información sobre tratamientos naturales.",
    icon: "handHeart",
    active: true,
    featured: true,
    seo: {
      title: "Tratamientos naturales personalizados en El Alto | Salud Intercultural",
      description:
        "Planes complementarios personalizados con enfoque natural, prevención y orientación según evaluación."
    }
  }
];
