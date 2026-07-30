import type {
  InventoryAlertStatus,
  InventoryItemUsage,
  InventoryMovementType
} from "@/generated/prisma/client";

export const inventoryMovementTypeLabels: Record<InventoryMovementType, string> = {
  entry: "Entrada",
  purchase_receipt: "Recepción de compra",
  automatic_sale_exit: "Salida por venta",
  authorized_manual_adjustment: "Ajuste autorizado",
  lot_adjustment: "Ajuste de lote",
  supplier_return: "Devolución a proveedor",
  patient_return: "Devolución de paciente",
  correction: "Corrección"
};

export const inventoryAlertStatusLabels: Record<InventoryAlertStatus, string> = {
  open: "Abierta",
  resolved: "Resuelta"
};

export const inventoryItemUsageLabels: Record<InventoryItemUsage, string> = {
  sale: "Venta",
  internal_use: "Uso interno",
  both: "Venta y uso interno"
};

export function formatInventoryMoney(cents: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2
  }).format(cents / 100);
}
