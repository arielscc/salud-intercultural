import {
  Boxes,
  ClipboardList,
  FileSignature,
  GitBranch,
  HeartPulse,
  Home,
  PhoneCall,
  MessageSquareText,
  Receipt,
  ShoppingCart,
  ShieldCheck,
  Stethoscope,
  Timer,
  UserCog,
  UserRound,
  ChartNoAxesCombined,
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
  {
    href: "/sigeco/opiniones",
    label: "Opiniones",
    icon: MessageSquareText,
    permission: "feedback_read"
  },
  { href: "/sigeco/inventario", label: "Inventario", icon: Boxes, permission: "inventory_read" },
  { href: "/sigeco/compras", label: "Compras", icon: ShoppingCart, permission: "purchases_read" },
  {
    href: "/sigeco/atribucion",
    label: "Captación",
    icon: ChartNoAxesCombined,
    permission: "reports_read"
  },
  {
    href: "/sigeco/reportes/recorrido",
    label: "Recorrido",
    icon: GitBranch,
    permission: "reports_read"
  },
  {
    href: "/sigeco/reportes/tiempos",
    label: "Tiempos",
    icon: Timer,
    permission: "reports_read"
  },
  { href: "/sigeco/auditoria", label: "Auditoría", icon: ShieldCheck, permission: "audit_read" },
  {
    href: "/sigeco/documentos/configuracion",
    label: "Documentos",
    icon: FileSignature,
    permission: "documents_configure"
  },
  { href: "/sigeco/usuarios", label: "Usuarios", icon: UserCog, permission: "users_manage" },
  { href: "/sigeco/mi-cuenta", label: "Mi cuenta", icon: UserRound, permission: "internal_access" }
];
