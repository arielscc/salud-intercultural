// Importa desde el archivo de enums standalone (no desde el client de Prisma):
// este mapa lo usan componentes "use client" a través de los helpers de
// activation.ts, y traer el valor del enum desde el client arrastraría el
// runtime de Prisma al bundle del navegador.
import type { InternalPermission } from "@/generated/prisma/enums";
import type { SigecoModuleCode } from "@/features/modules/catalog";

/**
 * Qué módulos habilitan cada permiso.
 *
 * Un permiso queda habilitado cuando **al menos uno** de sus módulos está
 * activo. Por eso un permiso compartido declara todos los módulos que lo
 * necesitan: `patients_read` lo usan Recepción y Administración, y en la
 * Etapa 1 Administración debe poder leer fichas aunque Recepción esté apagada.
 *
 * Este mapa es la red amplia: impide ejecutar acciones de un módulo apagado.
 * La pertenencia exacta de una ruta a un módulo se resuelve aparte, con
 * `requireModule` (Tarea 3), porque varias rutas comparten un mismo permiso.
 *
 * Un arreglo vacío significa permiso retirado: ningún módulo lo habilita.
 */
export const permissionModules: Record<InternalPermission, readonly SigecoModuleCode[]> = {
  // Núcleo: entrar al sistema y administrar la plataforma nunca se bloquea.
  internal_access: ["core"],
  users_manage: ["core"],
  audit_read: ["core"],
  documents_configure: ["core"],

  // Leads: la UI interna se retiró en la V3.7 y los modelos quedaron solo como
  // historia. Ningún módulo los habilita; las acciones de `features/crm` no
  // tienen pantalla que las invoque.
  leads_read: [],
  leads_create: [],
  leads_update: [],
  leads_contact: [],
  leads_reminder: [],

  // Paciente: Recepción es el dueño, pero Administración da de alta al cliente
  // de mostrador en la Etapa 1 y lee su ficha para vender y cobrar.
  patients_read: ["recepcion", "administracion"],
  patients_create: ["recepcion", "administracion"],
  patients_update: ["recepcion", "administracion"],

  // Visita y ruta entre áreas: existen solo cuando Recepción está activa.
  visits_read: ["recepcion"],
  visits_create: ["recepcion"],
  visits_update: ["recepcion"],
  patient_route_read: ["recepcion"],
  patient_route_update: ["recepcion"],
  visit_discontinuations_read: ["recepcion"],
  visit_discontinuations_write: ["recepcion"],
  patient_consents_read: ["recepcion"],
  patient_consents_write: ["recepcion"],
  patient_duplicates_read: ["recepcion"],
  patient_duplicates_review: ["recepcion"],
  patient_duplicates_merge: ["recepcion"],

  // Tiempo por área: cada área operativa marca su propio inicio y fin.
  area_time_write: ["recepcion", "consulta", "enfermeria", "administracion"],

  // Captación: se registra en la llegada y se analiza en los reportes.
  attribution_manage: ["recepcion", "reportes"],

  // Adjuntos clínicos: se cargan desde la ficha del paciente y desde las áreas
  // clínicas. El borrado sigue reservado al super administrador por rol.
  attachments_read: ["recepcion", "consulta", "enfermeria"],
  attachments_write: ["recepcion", "consulta", "enfermeria"],
  attachments_delete: ["recepcion", "consulta", "enfermeria"],

  // Consulta médica.
  clinical_read: ["consulta"],
  clinical_write: ["consulta"],
  clinical_finalize: ["consulta"],
  clinical_correct: ["consulta"],

  // Enfermería: el médico lee resultados, Enfermería los registra.
  nursing_read: ["enfermeria", "consulta"],
  nursing_write: ["enfermeria"],
  studies_read: ["enfermeria", "consulta"],
  studies_write: ["enfermeria"],

  // Ventas, cobros y Caja.
  sales_read: ["administracion"],
  sales_write: ["administracion"],
  payments_write: ["administracion"],
  cash_sessions_read: ["administracion"],
  cash_sessions_open: ["administracion"],
  cash_sessions_close: ["administracion"],
  cash_sessions_approve: ["administracion"],
  cash_movements_create: ["administracion"],
  cash_movements_reverse: ["administracion"],

  // Inventario: la lectura la necesitan quienes venden, compran o aplican
  // productos; la escritura y los costos quedan en Inventario y Compras.
  inventory_read: ["inventario", "administracion", "compras", "consulta", "enfermeria"],
  inventory_write: ["inventario"],
  inventory_adjust: ["inventario"],
  inventory_cost_read: ["inventario", "compras"],
  inventory_lot_adjust: ["inventario", "compras"],
  suppliers_read: ["inventario", "compras"],
  suppliers_write: ["inventario"],

  // Compras y recepciones.
  purchases_read: ["compras"],
  purchases_write: ["compras"],
  purchase_receipts_write: ["compras"],

  // Catálogo vendible: lo administra Catálogo y lo consumen quienes arman un
  // pedido o una venta.
  service_catalog_read: ["catalogo", "administracion", "consulta", "recepcion"],
  service_catalog_write: ["catalogo"],
  discount_threshold_manage: ["catalogo", "inventario"],

  // Seguimiento y recordatorios.
  followups_read: ["seguimientos"],
  followups_write: ["seguimientos"],
  reminder_rules_manage: ["seguimientos"],
  reminders_review: ["seguimientos"],

  // Opiniones y reclamos.
  feedback_read: ["opiniones"],
  feedback_manage: ["opiniones"],

  // Reportes de gestión.
  reports_read: ["reportes"]
};

/**
 * Permisos retirados: quedan en el enum porque hay filas y código histórico,
 * pero ningún módulo los habilita y ninguna activación los devuelve.
 */
export const retiredPermissions: readonly InternalPermission[] = (
  Object.keys(permissionModules) as InternalPermission[]
).filter((permission) => permissionModules[permission].length === 0);
