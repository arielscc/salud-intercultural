export const publicRoutes = [
  { href: "/", label: "Inicio", secondary: false },
  { href: "/nosotros", label: "Nosotros", secondary: false },
  { href: "/servicios", label: "Servicios", secondary: false },
  { href: "/tratamientos", label: "Tratamientos", secondary: false },
  { href: "/equipo", label: "Equipo", secondary: false },
  { href: "/testimonios", label: "Testimonios", secondary: false },
  { href: "/preguntas-frecuentes", label: "Preguntas frecuentes", secondary: false },
  { href: "/contacto", label: "Contacto", secondary: false },
  { href: "/politica-privacidad", label: "Politica de privacidad", secondary: true },
  { href: "/terminos-condiciones", label: "Terminos y condiciones", secondary: true }
] as const;

export const primaryPublicRoutes = publicRoutes.filter((route) => !route.secondary);
export const legalPublicRoutes = publicRoutes.filter((route) => route.secondary);

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
