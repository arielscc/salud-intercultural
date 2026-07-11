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
import type { InternalPermission } from "@/generated/prisma/client";

export type SigecoNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: InternalPermission;
};

export const sigecoNavItems: SigecoNavItem[] = [
  { href: "/sigeco", label: "Inicio", icon: Home, permission: "internal_access" },
  { href: "/sigeco/recepcion", label: "Recepción", icon: ClipboardList, permission: "visits_read" },
  { href: "/sigeco/consultas", label: "Consulta", icon: Stethoscope, permission: "clinical_read" },
  { href: "/sigeco/enfermeria", label: "Enfermería", icon: HeartPulse, permission: "nursing_read" },
  { href: "/sigeco/administracion", label: "Caja", icon: Receipt, permission: "sales_read" },
  {
    href: "/sigeco/seguimientos",
    label: "Seguimiento",
    icon: PhoneCall,
    permission: "followups_read"
  },
  { href: "/sigeco/inventario", label: "Inventario", icon: Boxes, permission: "inventory_read" }
];
