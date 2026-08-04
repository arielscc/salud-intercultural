"use client";

import { useState } from "react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";

// Solo dígitos y un punto decimal, con máximo 2 decimales (ej. "50.20").
function sanitizeMoney(value: string) {
  let v = value.replace(/[^\d.]/g, "");
  const dot = v.indexOf(".");
  if (dot !== -1) {
    const intPart = v.slice(0, dot);
    const decPart = v.slice(dot + 1).replace(/\./g, "").slice(0, 2);
    v = `${intPart}.${decPart}`;
  }
  return v;
}

export function SaleDiscountForm({
  action,
  saleId,
  workItemId
}: {
  action: (formData: FormData) => Promise<void>;
  saleId: string;
  workItemId: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [discount, setDiscount] = useState("0.00");

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="saleId" value={saleId} />
      <input type="hidden" name="workItemId" value={workItemId} />
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="size-4"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Aplicar descuento
      </label>
      {enabled ? (
        <div className="grid gap-3">
          <Field label="Descuento Bs">
            <input
              className={internalInputClassName}
              name="discount"
              inputMode="decimal"
              value={discount}
              onChange={(event) => setDiscount(sanitizeMoney(event.target.value))}
            />
          </Field>
          <SubmitButton variant="outline">Aplicar descuento</SubmitButton>
        </div>
      ) : null}
    </form>
  );
}
