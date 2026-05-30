import type { InternalPermission, InternalRole } from "@/generated/prisma/client";

export const internalRoleLabels: Record<InternalRole, string> = {
  super_admin: "Super administrador",
  direccion: "Dirección",
  medico: "Médico",
  recepcion: "Recepción",
  captacion: "Captación",
  administracion: "Administración",
  enfermeria: "Enfermería"
};

export const internalRolePermissions: Record<InternalRole, InternalPermission[]> = {
  super_admin: [
    "internal_access",
    "leads_read",
    "leads_create",
    "leads_update",
    "leads_contact",
    "leads_reminder",
    "reports_read"
  ],
  direccion: ["internal_access", "leads_read", "reports_read"],
  medico: ["internal_access"],
  recepcion: ["internal_access", "leads_read", "leads_create", "leads_update"],
  captacion: [
    "internal_access",
    "leads_read",
    "leads_create",
    "leads_update",
    "leads_contact",
    "leads_reminder"
  ],
  administracion: ["internal_access", "leads_read"],
  enfermeria: ["internal_access"]
};

export function roleHasPermission(role: InternalRole, permission: InternalPermission) {
  return internalRolePermissions[role].includes(permission);
}
