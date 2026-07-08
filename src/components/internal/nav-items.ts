import {
  Boxes,
  ClipboardList,
  HeartPulse,
  Home,
  PhoneCall,
  Receipt,
  Stethoscope,
  UserRoundSearch,
  UsersRound,
  type LucideIcon
} from "lucide-react";

export type SigecoNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const sigecoNavItems: SigecoNavItem[] = [
  { href: "/sigeco", label: "Inicio", icon: Home },
  { href: "/sigeco/leads", label: "Leads", icon: UserRoundSearch },
  { href: "/sigeco/pacientes", label: "Pacientes", icon: UsersRound },
  { href: "/sigeco/visitas", label: "Visitas", icon: ClipboardList },
  { href: "/sigeco/consultas", label: "Consulta", icon: Stethoscope },
  { href: "/sigeco/enfermeria", label: "Enfermería", icon: HeartPulse },
  { href: "/sigeco/administracion", label: "Caja", icon: Receipt },
  { href: "/sigeco/seguimientos", label: "Seguimiento", icon: PhoneCall },
  { href: "/sigeco/inventario", label: "Inventario", icon: Boxes }
];
