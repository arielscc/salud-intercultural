"use client";

import { ReceiptText } from "lucide-react";
import {
  OrderPickerDialog,
  type OrderPickerItem
} from "@/components/internal/order-picker/OrderPickerDialog";
import type { SaleItemType } from "@/generated/prisma/client";

type ChargeCatalogItem = {
  id: string;
  name: string;
  kind: "service" | "treatment";
  basePriceCents: number;
};

type ChargeInventoryItem = {
  id: string;
  name: string;
  salePriceCents: number;
};

type LineMeta = {
  itemType: SaleItemType;
  inventoryItemId?: string;
  description: string;
};

function catalogGroup(kind: ChargeCatalogItem["kind"]) {
  return kind === "treatment" ? "Tratamientos" : "Servicios";
}

export function AdministrationChargeDialog({
  action,
  patientId,
  visitId,
  workItemId,
  catalogItems,
  inventoryItems
}: {
  action: (formData: FormData) => Promise<void>;
  patientId: string;
  visitId: string;
  workItemId: string;
  catalogItems: ChargeCatalogItem[];
  inventoryItems: ChargeInventoryItem[];
}) {
  const catalogOptions = catalogItems.map((item) => ({
    key: `catalog:${item.id}`,
    label: item.name,
    group: catalogGroup(item.kind),
    unitPriceCents: item.basePriceCents
  }));
  const productOptions = inventoryItems.map((item) => ({
    key: `product:${item.id}`,
    label: item.name,
    group: "Productos",
    unitPriceCents: item.salePriceCents
  }));
  const items: OrderPickerItem[] = [...catalogOptions, ...productOptions];
  const metaByKey = new Map<string, LineMeta>([
    ...catalogItems.map((item) => [
      `catalog:${item.id}`,
      {
        itemType: item.kind as SaleItemType,
        description: item.name
      }
    ] as const),
    ...inventoryItems.map((item) => [
      `product:${item.id}`,
      {
        itemType: "product" as SaleItemType,
        inventoryItemId: item.id,
        description: item.name
      }
    ] as const)
  ]);

  return (
    <OrderPickerDialog
      action={action}
      items={items}
      formFields={
        <>
          <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="visitId" value={visitId} />
          <input type="hidden" name="workItemId" value={workItemId} />
        </>
      }
      lineFields={(item, line) => {
        const meta = metaByKey.get(item.key);
        if (!meta) return null;
        return (
          <>
            <input type="hidden" name="lineItemType" value={meta.itemType} />
            <input type="hidden" name="lineInventoryItemId" value={meta.inventoryItemId ?? ""} />
            <input type="hidden" name="lineDescription" value={meta.description} />
            <input type="hidden" name="lineUnitPrice" value={line.price} />
            <input type="hidden" name="lineQuantity" value={line.quantity} />
          </>
        );
      }}
      totalFieldName="total"
      discountFieldName="discount"
      notesFieldName="notes"
      notesLabel="Notas del cobro"
      title="Asignar cobro"
      description="Selecciona tratamientos, servicios o productos. Se creará una venta pendiente para registrar el pago en Caja."
      emptyMessage="No hay tratamientos, servicios ni productos activos para cobrar."
      triggerLabel="Asignar cobro"
      triggerIcon={<ReceiptText className="h-5 w-5" aria-hidden="true" />}
      submitLabel="Crear cobro"
      maxQuantity={999}
    />
  );
}
