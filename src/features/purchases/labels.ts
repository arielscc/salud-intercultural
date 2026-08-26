import type {
  InventoryLotAdjustmentKind,
  PurchasePaymentMethod,
  PurchaseStatus
} from "@/generated/prisma/client";

export const purchaseStatusLabels: Record<PurchaseStatus, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  partially_received: "Recibida parcialmente",
  received: "Recibida",
  cancelled: "Anulada"
};

export const purchasePaymentMethodLabels: Record<PurchasePaymentMethod, string> = {
  cash: "Efectivo desde Caja",
  transfer: "Transferencia desde Caja",
  credit: "Crédito",
  other: "Otro medio desde Caja"
};

export const inventoryLotAdjustmentKindLabels: Record<
  InventoryLotAdjustmentKind,
  string
> = {
  damage: "Daño",
  waste: "Merma",
  expired: "Vencimiento",
  supplier_return: "Devolución al proveedor",
  patient_return: "Devolución del paciente",
  correction: "Corrección autorizada"
};
