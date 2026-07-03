import type { InventoryAlertStatus, InventoryMovementType } from "@/generated/prisma/client";

export const inventoryMovementTypeLabels: Record<InventoryMovementType, string> = {
  entry: "Entrada",
  automatic_sale_exit: "Salida por venta",
  authorized_manual_adjustment: "Ajuste autorizado",
  correction: "Corrección"
};

export const inventoryAlertStatusLabels: Record<InventoryAlertStatus, string> = {
  open: "Abierta",
  resolved: "Resuelta"
};
