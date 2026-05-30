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
    "patients_read",
    "patients_create",
    "patients_update",
    "visits_read",
    "visits_create",
    "visits_update",
    "patient_route_read",
    "patient_route_update",
    "reports_read"
  ],
  direccion: [
    "internal_access",
    "leads_read",
    "patients_read",
    "visits_read",
    "patient_route_read",
    "reports_read"
  ],
  medico: ["internal_access", "patients_read", "visits_read", "patient_route_read"],
  recepcion: [
    "internal_access",
    "leads_read",
    "leads_create",
    "leads_update",
    "patients_read",
    "patients_create",
    "patients_update",
    "visits_read",
    "visits_create",
    "visits_update",
    "patient_route_read",
    "patient_route_update"
  ],
  captacion: [
    "internal_access",
    "leads_read",
    "leads_create",
    "leads_update",
    "leads_contact",
    "leads_reminder",
    "patients_read",
    "patients_create"
  ],
  administracion: ["internal_access", "leads_read", "patients_read", "visits_read", "patient_route_read"],
  enfermeria: ["internal_access", "patients_read", "visits_read", "patient_route_read"]
};

export function roleHasPermission(role: InternalRole, permission: InternalPermission) {
  return internalRolePermissions[role].includes(permission);
}
