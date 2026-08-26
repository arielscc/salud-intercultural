"use client";

import { Receipt } from "lucide-react";
import {
  OrderPickerDialog,
  type OrderPickerItem
} from "@/components/internal/order-picker/OrderPickerDialog";

export type AdministrationOrderOption = {
  source: "service" | "treatment" | "product";
  catalogItemId?: string;
  inventoryItemId?: string;
  label: string;
  group: string;
  unitPriceCents: number;
  perUnitCapCents: number;
};

function optionKey(option: AdministrationOrderOption) {
  return `${option.source}:${option.catalogItemId ?? option.inventoryItemId}`;
}

/**
 * Pedido del médico para Administración. La presentación vive en
 * `OrderPickerDialog`; aquí solo se mapean las opciones y los ocultos que espera
 * `parseDoctorOrderLines` (`lineSource`, `lineCatalogItemId`, …).
 */
/** Grupo de los medicamentos recetados que no existen como producto vendible. */
const FREE_TEXT_GROUP = "De la receta, sin producto";
const FREE_TEXT_PREFIX = "free_text:";

export function AdministrationOrderDialog({
  visitId,
  action,
  options,
  preselectedProductIds = [],
  prescribedWithoutProduct = [],
  triggerLabel = "Derivar a administración"
}: {
  visitId: string;
  action: (formData: FormData) => Promise<void>;
  options: AdministrationOrderOption[];
  /**
   * Productos del inventario que ya vienen en la receta de la visita: llegan
   * marcados para que el médico solo confirme la cantidad. Puede desmarcarlos.
   */
  preselectedProductIds?: string[];
  /**
   * Medicamentos recetados que no existen en el catálogo ni en el inventario.
   * Se ofrecen como línea de texto libre con precio a mano para que no
   * desaparezcan del pedido sin que el médico se entere.
   */
  prescribedWithoutProduct?: string[];
  triggerLabel?: string;
}) {
  const prescribed = new Set(preselectedProductIds);
  const items: OrderPickerItem[] = [
    // Primero lo recetado sin producto: es lo que el médico podría dar por perdido.
    ...prescribedWithoutProduct.map((medication) => ({
      key: `${FREE_TEXT_PREFIX}${medication}`,
      label: medication,
      group: FREE_TEXT_GROUP,
      unitPriceCents: 0,
      badge: "Receta"
    })),
    ...options.map((option) => {
      const isPrescribed = Boolean(
        option.inventoryItemId && prescribed.has(option.inventoryItemId)
      );
      return {
        key: optionKey(option),
        label: option.label,
        group: option.group,
        unitPriceCents: option.unitPriceCents,
        badge: isPrescribed ? "Receta" : undefined,
        preselected: isPrescribed
      };
    })
  ];
  const optionsByKey = new Map(options.map((option) => [optionKey(option), option]));

  return (
    <OrderPickerDialog
      action={action}
      items={items}
      formFields={
        <>
          <input type="hidden" name="visitId" value={visitId} />
          <input type="hidden" name="intent" value="submit" />
        </>
      }
      lineFields={(item, line) => {
        // Recetado sin producto: viaja como línea libre (sin catálogo ni stock).
        if (item.key.startsWith(FREE_TEXT_PREFIX)) {
          return (
            <>
              <input type="hidden" name="lineSource" value="free_text" />
              <input type="hidden" name="lineCatalogItemId" value="" />
              <input type="hidden" name="lineInventoryItemId" value="" />
              <input type="hidden" name="lineDescription" value={item.label} />
              <input type="hidden" name="lineUnitPrice" value={line.price} />
              <input type="hidden" name="lineQuantity" value={line.quantity} />
              <input type="hidden" name="lineDiscount" value="0" />
              <input type="hidden" name="lineSessionCount" value="" />
              <input type="hidden" name="linePricingMode" value="" />
            </>
          );
        }
        const option = optionsByKey.get(item.key);
        if (!option) return null;
        return (
          <>
            <input type="hidden" name="lineSource" value={option.source} />
            <input type="hidden" name="lineCatalogItemId" value={option.catalogItemId ?? ""} />
            <input type="hidden" name="lineInventoryItemId" value={option.inventoryItemId ?? ""} />
            <input type="hidden" name="lineDescription" value={option.label} />
            <input type="hidden" name="lineUnitPrice" value={line.price} />
            <input type="hidden" name="lineQuantity" value={line.quantity} />
            <input type="hidden" name="lineDiscount" value="0" />
            <input type="hidden" name="lineSessionCount" value="" />
            <input type="hidden" name="linePricingMode" value="" />
          </>
        );
      }}
      totalFieldName="chargeBase"
      discountFieldName="orderDiscount"
      notesFieldName="indications"
      notesLabel="Indicaciones para Administración (opcional)"
      title="Derivar a administración"
      description={
        prescribed.size > 0
          ? "Los medicamentos de la receta ya vienen marcados: confirma la cantidad de cada uno. Se envía a Administración para el cobro; el médico no cobra."
          : "Elige los ítems para el cobro. Se envía a Administración; el médico no cobra."
      }
      emptyMessage="No hay tratamientos, productos ni consultas activos en el catálogo."
      groupNotes={{
        [FREE_TEXT_GROUP]:
          "Recetados que no están en el inventario. Agrégalos con precio a mano solo si la clínica los va a vender; si no, el paciente los compra en farmacia."
      }}
      triggerLabel={triggerLabel}
      triggerIcon={<Receipt className="h-5 w-5" aria-hidden="true" />}
      submitLabel="Enviar a Administración"
      // `doctorOrderLineSchema` admite hasta 999 por línea.
      maxQuantity={999}
      invalidPriceMessage="Cada producto seleccionado necesita un precio (usa 0.00 si es sin costo)."
    />
  );
}
