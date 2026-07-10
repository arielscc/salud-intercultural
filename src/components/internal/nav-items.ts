import {
  Boxes,
  ClipboardList,
  HeartPulse,
  Home,
  PhoneCall,
  Receipt,
  Stethoscope,
  type LucideIcon
} from "lucide-react";

export type SigecoNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const sigecoNavItems: SigecoNavItem[] = [
  { href: "/sigeco", label: "Inicio", icon: Home },
  { href: "/sigeco/recepcion", label: "Recepción", icon: ClipboardList },
  { href: "/sigeco/consultas", label: "Consulta", icon: Stethoscope },
  { href: "/sigeco/enfermeria", label: "Enfermería", icon: HeartPulse },
  { href: "/sigeco/administracion", label: "Caja", icon: Receipt },
  { href: "/sigeco/seguimientos", label: "Seguimiento", icon: PhoneCall },
  { href: "/sigeco/inventario", label: "Inventario", icon: Boxes }
];
