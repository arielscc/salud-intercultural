import {
  Building2,
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
  Tags,
  Timer,
  ToggleRight,
  UserCog,
  UserRound,
  ChartNoAxesCombined,
  type LucideIcon
} from "lucide-react";
import type { InternalPermission } from "@/generated/prisma/client";
import type { SigecoModuleCode } from "@/features/modules/catalog";

export type SigecoNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: InternalPermission;
  /**
   * Módulo al que pertenece la entrada. El menú la oculta mientras ese módulo no
   * esté lanzado, aunque el rol tenga el permiso.
   */
  module: SigecoModuleCode;
};

export const sigecoNavItems: SigecoNavItem[] = [
  { href: "/sigeco", label: "Inicio", icon: Home, permission: "internal_access", module: "core" },
  {
    href: "/sigeco/recepcion",
    label: "Recepción",
    icon: ClipboardList,
    permission: "visits_read",
    module: "recepcion"
  },
  {
    href: "/sigeco/consultas",
    label: "Consulta",
    icon: Stethoscope,
    permission: "clinical_read",
    module: "consulta"
  },
  {
    href: "/sigeco/enfermeria",
    label: "Enfermería",
    icon: HeartPulse,
    permission: "nursing_read",
    module: "enfermeria"
  },
  {
    href: "/sigeco/administracion",
    label: "Caja",
    icon: Receipt,
    permission: "sales_read",
    module: "administracion"
  },
  {
    href: "/sigeco/seguimientos",
    label: "Seguimiento",
    icon: PhoneCall,
    permission: "followups_read",
    module: "seguimientos"
  },
  {
    href: "/sigeco/opiniones",
    label: "Opiniones",
    icon: MessageSquareText,
    permission: "feedback_read",
    module: "opiniones"
  },
  {
    href: "/sigeco/catalogo",
    label: "Catálogo",
    icon: Tags,
    permission: "service_catalog_read",
    module: "catalogo"
  },
  {
    href: "/sigeco/inventario",
    label: "Inventario",
    icon: Boxes,
    permission: "inventory_read",
    module: "inventario"
  },
  {
    href: "/sigeco/compras",
    label: "Compras",
    icon: ShoppingCart,
    permission: "purchases_read",
    module: "compras"
  },
  {
    href: "/sigeco/atribucion",
    label: "Captación",
    icon: ChartNoAxesCombined,
    permission: "reports_read",
    module: "reportes"
  },
  {
    href: "/sigeco/reportes/recorrido",
    label: "Recorrido",
    icon: GitBranch,
    permission: "reports_read",
    module: "reportes"
  },
  {
    href: "/sigeco/reportes/tiempos",
    label: "Tiempos",
    icon: Timer,
    permission: "reports_read",
    module: "reportes"
  },
  {
    href: "/sigeco/sucursales",
    label: "Sucursales",
    icon: Building2,
    permission: "reports_read",
    module: "core"
  },
  {
    href: "/sigeco/auditoria",
    label: "Auditoría",
    icon: ShieldCheck,
    permission: "audit_read",
    module: "core"
  },
  {
    href: "/sigeco/modulos",
    label: "Módulos",
    icon: ToggleRight,
    permission: "modules_read",
    module: "core"
  },
  {
    href: "/sigeco/documentos/configuracion",
    label: "Documentos",
    icon: FileSignature,
    permission: "documents_configure",
    module: "core"
  },
  {
    href: "/sigeco/usuarios",
    label: "Usuarios",
    icon: UserCog,
    permission: "users_manage",
    module: "core"
  },
  {
    href: "/sigeco/mi-cuenta",
    label: "Mi cuenta",
    icon: UserRound,
    permission: "internal_access",
    module: "core"
  }
];
