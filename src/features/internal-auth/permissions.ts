import type { InternalPermission, InternalRole } from "@/generated/prisma/client";

export const internalRoleLabels: Record<InternalRole, string> = {
  super_admin: "Super administrador",
  direccion: "Dirección",
  medico: "Médico",
  recepcion: "Recepción",
  captacion: "Captación",
  administracion: "Administración",
  enfermeria: "Enfermería",
  seguimiento: "Seguimiento"
};

/**
 * Rol deprecado por la simplificacion V3.7: no asignar a usuarios nuevos.
 * El valor permanece en el enum de Prisma porque existen filas con ese rol;
 * un usuario con este rol solo conserva `internal_access` hasta ser reasignado
 * (script `pnpm internal:set-role`).
 */
export const deprecatedInternalRoles: InternalRole[] = ["captacion"];

export const internalRolePermissions: Record<InternalRole, InternalPermission[]> = {
  super_admin: [
    "internal_access",
    "patients_read",
    "patients_create",
    "patients_update",
    "visits_read",
    "visits_create",
    "visits_update",
    "patient_route_read",
    "patient_route_update",
    "clinical_read",
    "clinical_write",
    "nursing_read",
    "nursing_write",
    "studies_read",
    "studies_write",
    "sales_read",
    "sales_write",
    "payments_write",
    "followups_read",
    "followups_write",
    "inventory_read",
    "inventory_write",
    "inventory_adjust",
    "reports_read",
    "audit_read"
  ],
  direccion: [
    "internal_access",
    "patients_read",
    "visits_read",
    "patient_route_read",
    "clinical_read",
    "nursing_read",
    "studies_read",
    "sales_read",
    "followups_read",
    "inventory_read",
    "reports_read",
    "audit_read"
  ],
  medico: [
    "internal_access",
    "patients_read",
    "visits_read",
    "visits_update",
    "patient_route_read",
    "patient_route_update",
    "clinical_read",
    "clinical_write",
    "nursing_read",
    "studies_read",
    "followups_read",
    "followups_write"
  ],
  recepcion: [
    "internal_access",
    "patients_read",
    "patients_create",
    "patients_update",
    "visits_read",
    "visits_create",
    "visits_update",
    "patient_route_read",
    "patient_route_update",
    "followups_read",
    "followups_write"
  ],
  captacion: ["internal_access"],
  administracion: [
    "internal_access",
    "patients_read",
    "visits_read",
    "visits_update",
    "patient_route_read",
    "sales_read",
    "sales_write",
    "payments_write",
    "followups_read",
    "followups_write",
    "inventory_read",
    "inventory_write"
  ],
  enfermeria: [
    "internal_access",
    "patients_read",
    "visits_read",
    "patient_route_read",
    "nursing_read",
    "nursing_write",
    "studies_read",
    "studies_write"
  ],
  seguimiento: [
    "internal_access",
    "patients_read",
    "followups_read",
    "followups_write"
  ]
};

export const assignableInternalRoles = (
  Object.keys(internalRolePermissions) as InternalRole[]
).filter((role) => !deprecatedInternalRoles.includes(role));

export function roleHasPermission(role: InternalRole, permission: InternalPermission) {
  return internalRolePermissions[role].includes(permission);
}
