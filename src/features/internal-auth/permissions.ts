// Importa desde el archivo de enums standalone (no desde el client de Prisma):
// permissions.ts lo usan componentes "use client", y traer el valor del enum
// desde el client arrastraría el runtime de Prisma al bundle del navegador.
import { InternalPermission, type InternalRole } from "@/generated/prisma/enums";

// Super administrador cumple todos los roles: siempre tiene TODOS los permisos.
// Se deriva del enum para que un permiso nuevo lo incluya automáticamente.
const allInternalPermissions = Object.values(InternalPermission) as InternalPermission[];

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
 * Roles deprecados: no se asignan a usuarios nuevos.
 * El valor permanece en el enum de Prisma porque existen filas con ese rol;
 * un usuario con este rol solo conserva `internal_access` hasta ser reasignado
 * (script `pnpm internal:set-role`).
 * - `captacion`: retirado por la simplificacion V3.7.
 * - `seguimiento`: retirado el 2026-08-02; el seguimiento de pacientes lo hace
 *   ahora Recepcion. Las cuentas existentes se reasignan a `recepcion`.
 */
export const deprecatedInternalRoles: InternalRole[] = ["captacion", "seguimiento"];

export const internalRolePermissions: Record<InternalRole, InternalPermission[]> = {
  super_admin: allInternalPermissions,
  direccion: [
    "internal_access",
    "patients_read",
    "visits_read",
    "patient_route_read",
    "clinical_read",
    "nursing_read",
    "studies_read",
    "sales_read",
    "cash_sessions_read",
    "cash_movements_reverse",
    "cash_sessions_approve",
    "followups_read",
    "reminder_rules_manage",
    "feedback_read",
    "feedback_manage",
    "inventory_read",
    "inventory_cost_read",
    "suppliers_read",
    "purchases_read",
    "reports_read",
    "audit_read",
    "attachments_read",
    "patient_consents_read",
    "attribution_manage",
    "patient_duplicates_read",
    "modules_read",
    "visit_discontinuations_read",
    "documents_configure",
    "service_catalog_read",
    "discount_threshold_manage"
  ],
  medico: [
    "internal_access",
    "patients_read",
    "visits_read",
    "visits_update",
    "patient_route_read",
    "patient_route_update",
    "area_time_write",
    "clinical_read",
    "clinical_write",
    "clinical_finalize",
    "clinical_correct",
    "nursing_read",
    "studies_read",
    "attachments_read",
    "attachments_write",
    "followups_read",
    "followups_write",
    "inventory_read",
    "patient_consents_read",
    "visit_discontinuations_read",
    "visit_discontinuations_write",
    "service_catalog_read"
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
    "area_time_write",
    "followups_read",
    "followups_write",
    "reminders_review",
    "patient_consents_read",
    "patient_consents_write",
    "patient_duplicates_read",
    "patient_duplicates_review",
    "visit_discontinuations_read",
    "visit_discontinuations_write",
    "service_catalog_read"
  ],
  captacion: ["internal_access"],
  administracion: [
    "internal_access",
    "patients_read",
    // Etapa 1: Administración registra al cliente de mostrador y corrige sus
    // datos, sin abrir visita. El funnel de Recepción sigue siendo el alta
    // completa cuando ese módulo está lanzado.
    "patients_create",
    "patients_update",
    "visits_read",
    "visits_update",
    "patient_route_read",
    "area_time_write",
    "sales_read",
    "sales_write",
    "payments_write",
    "cash_sessions_read",
    "cash_sessions_open",
    "cash_movements_create",
    "cash_sessions_close",
    "followups_read",
    "followups_write",
    "inventory_read",
    "inventory_write",
    "inventory_cost_read",
    "suppliers_read",
    "suppliers_write",
    "purchases_read",
    "purchases_write",
    "purchase_receipts_write",
    "inventory_lot_adjust",
    "patient_consents_read",
    "visit_discontinuations_read",
    "visit_discontinuations_write",
    "service_catalog_read",
    "service_catalog_write"
  ],
  enfermeria: [
    "internal_access",
    "patients_read",
    "visits_read",
    "patient_route_read",
    "area_time_write",
    "nursing_read",
    "nursing_write",
    "studies_read",
    "studies_write",
    "attachments_read",
    "attachments_write",
    "inventory_read",
    "patient_consents_read",
    "visit_discontinuations_read",
    "visit_discontinuations_write"
  ],
  // Rol deprecado (2026-08-02): conserva solo acceso minimo hasta reasignar.
  // El seguimiento de pacientes lo hace Recepcion.
  seguimiento: ["internal_access"]
};

export const assignableInternalRoles = (
  Object.keys(internalRolePermissions) as InternalRole[]
).filter((role) => !deprecatedInternalRoles.includes(role));

export function roleHasPermission(role: InternalRole, permission: InternalPermission) {
  return internalRolePermissions[role].includes(permission);
}
