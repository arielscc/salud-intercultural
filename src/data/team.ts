import type { TeamMember } from "@/types/landing";

export const teamMembers = [
  {
    id: "cinthia-jessica-chipana-chipana",
    name: "Dra. Cinthia Jessica Chipana Chipana",
    slug: "dra-cinthia-jessica-chipana-chipana",
    photo:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=85",
    photoAlt:
      "Foto institucional referencial preparada para la Dra. Cinthia Jessica Chipana Chipana",
    role: "Médica del equipo profesional",
    specialty: "Medicina natural, tradicional e integrativa",
    description:
      "Acompaña procesos de evaluación y orientación integral desde una mirada humana, preventiva e intercultural. Su perfil queda preparado para ampliar trayectoria, formación, áreas de atención y fotografía oficial desde el panel.",
    credentials: [
      "Atención médica integral",
      "Orientación en medicina natural",
      "Acompañamiento preventivo"
    ],
    focusAreas: [
      "Evaluación personalizada",
      "Hábitos y prevención",
      "Salud familiar",
      "Terapias complementarias"
    ],
    active: true,
    featured: true,
    order: 1
  },
  {
    id: "jhonn-franco-chipana-chipana",
    name: "Dr. Jhonn Franco Chipana Chipana",
    slug: "dr-jhonn-franco-chipana-chipana",
    photo:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=900&q=85",
    photoAlt:
      "Foto institucional referencial preparada para el Dr. Jhonn Franco Chipana Chipana",
    role: "Médico del equipo profesional",
    specialty: "Atención integral y terapias complementarias",
    description:
      "Brinda orientación enfocada en comprender el contexto del paciente, sus síntomas, hábitos y necesidades de seguimiento. Su perfil queda listo para administrar cargo, especialidad, biografía, estado y orden de aparición.",
    credentials: [
      "Atención clínica integral",
      "Terapias complementarias",
      "Seguimiento personalizado"
    ],
    focusAreas: [
      "Consulta integral",
      "Bienestar preventivo",
      "Dolor y recuperación",
      "Orientación terapéutica"
    ],
    active: true,
    featured: true,
    order: 2
  },
  {
    id: "equipo-futuro",
    name: "Nuevo integrante del equipo",
    slug: "nuevo-integrante",
    photo:
      "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=900&q=85",
    photoAlt: "Espacio preparado para una fotografía de un futuro integrante del equipo",
    role: "Perfil futuro",
    specialty: "Especialidad por definir",
    description:
      "Registro de ejemplo para validar que el sistema soporta nuevos profesionales, estado activo o inactivo y orden de aparición desde el panel administrativo.",
    credentials: ["Campo administrable", "Estado activo/inactivo", "Orden editable"],
    focusAreas: ["Especialidad futura", "Contenido CMS", "Perfil administrable"],
    active: false,
    featured: false,
    order: 99
  }
] satisfies TeamMember[];

export const activeTeamMembers = teamMembers
  .filter((member) => member.active)
  .sort((a, b) => a.order - b.order);

export const featuredTeamMembers = activeTeamMembers.filter((member) => member.featured);
