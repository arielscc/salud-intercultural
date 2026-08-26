import type {
  CashChannel,
  CashExpenseCategory,
  CashExpenseKind,
  CashMovementType,
  CashSessionStatus,
  CashShift
} from "@/generated/prisma/client";

export const cashChannelLabels: Record<CashChannel, string> = {
  cash: "Efectivo",
  qr: "QR",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro"
};

export const cashMovementTypeLabels: Record<CashMovementType, string> = {
  income: "Ingreso",
  expense: "Egreso",
  adjustment: "Ajuste anterior",
  refund: "Devolución",
  reversal: "Cambio devuelto"
};

export const cashSessionStatusLabels: Record<CashSessionStatus, string> = {
  open: "Abierta",
  pending_approval: "Espera aprobación",
  closed: "Cerrada"
};

export const cashShiftLabels: Record<CashShift, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  full_day: "Día completo",
  other: "Otro"
};

export const cashExpenseKindLabels: Record<CashExpenseKind, string> = {
  staff_support: "Dinero al personal",
  urgent_purchase: "Compra urgente",
  other: "Otro egreso"
};

export const cashExpenseCategoryLabels: Record<CashExpenseCategory, string> = {
  lunch: "Almuerzo",
  transport: "Transporte",
  staff_other: "Otro apoyo al personal",
  injectables: "Inyectables",
  clinical_material: "Material clínico",
  cleaning: "Limpieza",
  office: "Oficina",
  other: "Otro"
};

/**
 * Mensajes de las reglas de Caja. Los comparten Control de Caja y las pantallas
 * de cobro, porque la apertura ahora puede lanzarse desde cualquiera de ellas.
 */
export const cashErrorMessages: Record<string, string> = {
  "cash-invalid-session":
    "Revisa la fecha, el responsable y el efectivo inicial.",
  "cash-session-required":
    "No hay una Caja abierta. Primero abre la sesión del día.",
  "cash-session-stale-open":
    "Hay una Caja abierta de una fecha anterior. Debes cerrarla o regularizarla antes de operar hoy.",
  "cash-session-already-open":
    "Esta caja ya tiene una sesión abierta o esperando aprobación.",
  "cash-session-exceptional-required":
    "Hoy ya hubo una Caja cerrada. Para volver a cobrar en el mismo día, abre una Caja excepcional con motivo.",
  "cash-exceptional-reason-required":
    "La apertura excepcional requiere una descripción del motivo.",
  "cash-exceptional-prior-close-required":
    "La Caja excepcional solo se permite después de un cierre previo del mismo día.",
  "cash-invalid-expense": "Revisa los datos y los montos del egreso.",
  "cash-no-beneficiaries":
    "Escribe un monto para al menos un empleado beneficiario.",
  "cash-invalid-purchase":
    "Revisa el artículo, la cantidad, el precio y las personas responsables.",
  "cash-invalid-receipt":
    "El comprobante debe ser una imagen JPG, PNG o WebP y pesar como máximo 4 MB.",
  "cash-invalid-close":
    "Escribe los valores contados o reportados para todos los medios.",
  "cash-invalid-approval":
    "Dirección debe explicar brevemente por qué aprueba la diferencia.",
  "cash-invalid-correction":
    "Revisa el monto y escribe el motivo de la corrección.",
  "cash-correction-exceeds":
    "La devolución o el cambio devuelto supera el saldo que queda por corregir.",
  "cash-close-not-pending":
    "Esta Caja ya no está esperando una aprobación.",
  "cash-invalid-operation":
    "La operación no cumple las reglas de Caja y no fue registrada."
};
