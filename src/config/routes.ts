export const publicRoutes = [
  { href: "/", label: "Inicio" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/servicios", label: "Servicios" },
  { href: "/tratamientos", label: "Tratamientos" },
  { href: "/equipo", label: "Equipo" },
  { href: "/testimonios", label: "Testimonios" },
  { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
  { href: "/contacto", label: "Contacto" },
  { href: "/politica-privacidad", label: "Politica de privacidad" },
  { href: "/terminos-condiciones", label: "Terminos y condiciones" }
] as const;

export const adminRoutes = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/testimonios", label: "Testimonios" },
  { href: "/admin/faqs", label: "FAQs" },
  { href: "/admin/configuracion", label: "Configuracion" }
] as const;

export const apiRoutes = {
  leads: "/api/leads",
  leadById: (id: string) => `/api/leads/${id}`,
  analyticsEvents: "/api/analytics/events"
} as const;

export type PublicRoute = (typeof publicRoutes)[number]["href"];
export type AdminRoute = (typeof adminRoutes)[number]["href"];
