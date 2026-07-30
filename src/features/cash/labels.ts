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
  reversal: "Reintegro"
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
