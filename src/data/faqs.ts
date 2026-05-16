import type { FAQ } from "@/types/landing";

export const faqs: FAQ[] = [
  {
    id: "atienden-sin-cita",
    question: "¿Atienden sin cita?",
    answer:
      "Recomendamos agendar previamente vía WhatsApp o llamada para brindarte una mejor atención.",
    category: "appointments",
    active: true,
    featured: true,
    order: 1
  },
  {
    id: "ubicacion-clinica",
    question: "¿Dónde están ubicados?",
    answer:
      "Estamos en Cruce Villa Adela, El Alto, sobre la Av. “A” entre calle 6 y Av. Bolivia, primer piso.",
    category: "location",
    active: true,
    featured: true,
    order: 2
  },
  {
    id: "tienen-whatsapp",
    question: "¿Tienen WhatsApp?",
    answer: "Sí, puedes escribirnos directamente al +591 64175822.",
    category: "contact",
    active: true,
    featured: true,
    order: 3
  },
  {
    id: "tambien-puedo-llamar",
    question: "¿También puedo llamar?",
    answer: "Sí, también puedes comunicarte por llamada directa.",
    category: "contact",
    active: true,
    featured: false,
    order: 4
  },
  {
    id: "tratamientos-personalizados",
    question: "¿Los tratamientos son personalizados?",
    answer: "Sí, cada paciente recibe orientación individual según evaluación.",
    category: "treatments",
    active: true,
    featured: true,
    order: 5
  },
  {
    id: "atienden-adultos-mayores",
    question: "¿Atienden adultos mayores?",
    answer:
      "Sí, atendemos adultos y adultos mayores con enfoque humano e integral.",
    category: "treatments",
    active: true,
    featured: false,
    order: 6
  },
  {
    id: "precios-whatsapp",
    question: "¿Puedo consultar precios por WhatsApp?",
    answer:
      "Sí, puedes consultar información general. El costo puede variar según la evaluación y el tratamiento recomendado.",
    category: "pricing",
    active: true,
    featured: false,
    order: 7
  },
  {
    id: "usan-medicina-natural",
    question: "¿Usan medicina natural?",
    answer: "Sí, trabajamos con un enfoque natural, tradicional e integrativo.",
    category: "treatments",
    active: true,
    featured: false,
    order: 8
  },
  {
    id: "consulta-antes-tratamiento",
    question: "¿La consulta es obligatoria antes del tratamiento?",
    answer:
      "Es recomendable para orientar mejor cada caso y definir el acompañamiento adecuado.",
    category: "appointments",
    active: true,
    featured: false,
    order: 9
  },
  {
    id: "pregunta-futura-cms",
    question: "Pregunta futura administrable",
    answer:
      "Registro inactivo de ejemplo para validar estado activo/inactivo, categoría, destacado y orden desde el panel.",
    category: "treatments",
    active: false,
    featured: false,
    order: 99
  }
];

export const faqCategories = [
  { id: "all", label: "Todas" },
  { id: "appointments", label: "Citas" },
  { id: "location", label: "Ubicación" },
  { id: "contact", label: "Contacto" },
  { id: "treatments", label: "Tratamientos" },
  { id: "pricing", label: "Costos" }
] as const;

export const activeFaqs = faqs
  .filter((faq) => faq.active)
  .sort((a, b) => a.order - b.order);

export const featuredFaqs = activeFaqs.filter((faq) => faq.featured);
