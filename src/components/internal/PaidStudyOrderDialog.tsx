"use client";

import { HeartPulse } from "lucide-react";
import {
  OrderPickerDialog,
  type OrderPickerItem
} from "@/components/internal/order-picker/OrderPickerDialog";

export type PaidStudyOption = {
  id: string;
  label: string;
  referenceCents: number;
  capCents?: number;
  // "catalog" (estudio/servicio) por defecto; "product" para inventario.
  kind?: "catalog" | "product";
  /** Encabezado opcional; por defecto se agrupa por tipo. */
  group?: string;
};

function groupOf(study: PaidStudyOption) {
  return study.group ?? (study.kind === "product" ? "Productos" : "Estudios y servicios");
}

/**
 * Derivación con cobro previo (Enfermería o Administración). La presentación vive
 * en `OrderPickerDialog`; aquí solo se mapean las opciones y los ocultos que espera
 * `paidStudyOrderSchema` (`studyRef`, `studyPrice`, `studyQuantity`, `total`,
 * `discount`, `details`).
 */
export function PaidStudyOrderDialog({
  visitId,
  action,
  studies,
  compactTrigger = false,
  triggerLabel = "Derivar a enfermería",
  title = "Derivar a enfermería",
  description = "Toca una tarjeta para agregar el estudio o servicio. La ficha pasa primero a Administración para el cobro.",
  emptyMessage = "No hay estudios ni servicios de enfermería activos en el catálogo.",
  notesLabel = "Indicaciones para Enfermería",
  submitLabel = "Enviar orden a Administración"
}: {
  visitId: string;
  action: (formData: FormData) => Promise<void>;
  studies: PaidStudyOption[];
  compactTrigger?: boolean;
  triggerLabel?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
  notesLabel?: string;
  submitLabel?: string;
}) {
  const items: OrderPickerItem[] = studies.map((study) => ({
    key: `${study.kind ?? "catalog"}:${study.id}`,
    label: study.label,
    group: groupOf(study),
    unitPriceCents: study.referenceCents
  }));

  return (
    <OrderPickerDialog
      action={action}
      items={items}
      formFields={<input type="hidden" name="visitId" value={visitId} />}
      lineFields={(item, line) => (
        <>
          <input type="hidden" name="studyRef" value={item.key} />
          <input type="hidden" name="studyPrice" value={line.price} />
          <input type="hidden" name="studyQuantity" value={line.quantity} />
        </>
      )}
      totalFieldName="total"
      discountFieldName="discount"
      notesFieldName="details"
      notesLabel={notesLabel}
      title={title}
      description={description}
      emptyMessage={emptyMessage}
      triggerLabel={triggerLabel}
      triggerIcon={
        <HeartPulse className={compactTrigger ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      }
      compactTrigger={compactTrigger}
      submitLabel={submitLabel}
    />
  );
}
