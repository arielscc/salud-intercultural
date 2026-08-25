import type { InternalPermission } from "@/generated/prisma/enums";

/**
 * ¿El permiso sirve para mirar o para cambiar?
 *
 * Un módulo suspendido conserva la lectura para Dirección y el super
 * administrador —el trabajo que quedó abierto tiene que poder consultarse— y
 * bloquea toda escritura, para nadie. Sin esta distinción, apagar un módulo
 * escondería justo la información que hace falta para decidir qué hacer con él.
 *
 * La clasificación se declara, no se deduce del nombre: `reminders_review`
 * aprueba un contacto y `patient_duplicates_review` registra una decisión;
 * ninguno de los dos es una lectura aunque no diga `write`.
 */
export const permissionAccess: Record<InternalPermission, "read" | "write"> = {
  // Núcleo
  internal_access: "read",
  audit_read: "read",
  modules_read: "read",
  modules_manage: "write",
  users_manage: "write",
  documents_configure: "write",

  // Leads (retirados)
  leads_read: "read",
  leads_create: "write",
  leads_update: "write",
  leads_contact: "write",
  leads_reminder: "write",

  // Paciente, visita y ruta
  patients_read: "read",
  patients_create: "write",
  patients_update: "write",
  visits_read: "read",
  visits_create: "write",
  visits_update: "write",
  patient_route_read: "read",
  patient_route_update: "write",
  area_time_write: "write",
  visit_discontinuations_read: "read",
  visit_discontinuations_write: "write",
  patient_consents_read: "read",
  patient_consents_write: "write",
  patient_duplicates_read: "read",
  // Revisar y fusionar registran una decisión: son escritura.
  patient_duplicates_review: "write",
  patient_duplicates_merge: "write",
  attribution_manage: "write",

  // Adjuntos clínicos
  attachments_read: "read",
  attachments_write: "write",
  attachments_delete: "write",

  // Consulta
  clinical_read: "read",
  clinical_write: "write",
  clinical_finalize: "write",
  clinical_correct: "write",

  // Enfermería
  nursing_read: "read",
  nursing_write: "write",
  studies_read: "read",
  studies_write: "write",

  // Ventas, cobros y Caja
  sales_read: "read",
  sales_write: "write",
  payments_write: "write",
  cash_sessions_read: "read",
  cash_sessions_open: "write",
  cash_sessions_close: "write",
  cash_sessions_approve: "write",
  cash_movements_create: "write",
  cash_movements_reverse: "write",

  // Inventario y compras
  inventory_read: "read",
  inventory_write: "write",
  inventory_adjust: "write",
  inventory_cost_read: "read",
  inventory_lot_adjust: "write",
  suppliers_read: "read",
  suppliers_write: "write",
  purchases_read: "read",
  purchases_write: "write",
  purchase_receipts_write: "write",

  // Catálogo
  service_catalog_read: "read",
  service_catalog_write: "write",
  discount_threshold_manage: "write",

  // Seguimiento y recordatorios
  followups_read: "read",
  followups_write: "write",
  reminder_rules_manage: "write",
  // Aprobar un candidato crea el contacto: es escritura.
  reminders_review: "write",

  // Opiniones
  feedback_read: "read",
  feedback_manage: "write",

  // Reportes
  reports_read: "read"
};

export function isReadPermission(permission: InternalPermission) {
  return permissionAccess[permission] === "read";
}

export function isWritePermission(permission: InternalPermission) {
  return permissionAccess[permission] === "write";
}
