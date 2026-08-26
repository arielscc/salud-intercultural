"use client";

import { useState } from "react";
import { PackageCheck } from "lucide-react";
import type { DoctorOrderLineSource } from "@/generated/prisma/client";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { PaymentMethodChips } from "@/components/internal/PaymentMethodChips";
import { SubmitButton } from "@/components/internal/SubmitButton";
import {
  doctorOrderLineSourceLabels,
  formatDoctorOrderMoney
} from "@/features/doctor-orders/labels";

// Administración NO ve los costos por producto; solo el detalle, la cantidad y el
// total. Los costos por línea los ve únicamente el médico.
type ConfirmLine = {
  id: string;
  source: DoctorOrderLineSource;
  description: string;
  quantity: number;
};

type DoctorOrderConfirmPanelProps = {
  action: (formData: FormData) => Promise<void>;
  orderId: string;
  workItemId: string;
  patientName: string;
  lines: ConfirmLine[];
  totalCents: number;
  indications: string | null;
  doctorName: string;
};

function toCents(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

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

export function DoctorOrderConfirmPanel({
  action,
  orderId,
  workItemId,
  patientName,
  lines,
  totalCents,
  indications,
  doctorName
}: DoctorOrderConfirmPanelProps) {
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discount, setDiscount] = useState("0.00");

  const adminDiscountCents = discountEnabled
    ? Math.min(Math.max(0, toCents(discount)), totalCents)
    : 0;
  const finalTotalCents = Math.max(0, totalCents - adminDiscountCents);

  return (
    <ConfirmForm
      action={action}
      notice="Venta creada desde el pedido del médico"
      confirmTitle="Confirmar pedido y crear venta"
      confirmDescription={`Se creará la venta de ${patientName} por ${formatDoctorOrderMoney(finalTotalCents)}. El cobro se registra en Caja.`}
      confirmLabel="Confirmar y crear venta"
      confirmAtAllWidths
      className="grid gap-4"
    >
      <input type="hidden" name="doctorOrderId" value={orderId} />
      <input type="hidden" name="workItemId" value={workItemId} />
      <input
        type="hidden"
        name="discount"
        value={(adminDiscountCents / 100).toFixed(2)}
      />

      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-primary-dark" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Productos y servicios a entregar
          </p>
        </div>
        {lines.map((line, index) => (
          <div
            key={line.id}
            className="flex items-center gap-3 rounded-[9px] border border-border bg-surface px-3 py-2.5"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold tabular-nums text-primary-dark">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{line.description}</p>
              <p className="text-xs text-muted">{doctorOrderLineSourceLabels[line.source]}</p>
            </div>
            <span className="shrink-0 rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold tabular-nums text-text">
              × {line.quantity}
            </span>
          </div>
        ))}
      </div>

      {indications ? (
        <p className="rounded-[9px] bg-surface-soft px-3 py-2 text-sm text-muted">{indications}</p>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="size-4"
          checked={discountEnabled}
          onChange={(event) => setDiscountEnabled(event.target.checked)}
        />
        Aplicar descuento
      </label>
      {discountEnabled ? (
        <Field label="Descuento Bs">
          <input
            className={internalInputClassName}
            inputMode="decimal"
            value={discount}
            onChange={(event) => setDiscount(sanitizeMoney(event.target.value))}
          />
        </Field>
      ) : null}

      <div className="rounded-[9px] border border-border bg-background p-3 text-sm">
        <dl className="grid gap-1.5 tabular-nums">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Total del pedido</dt>
            <dd className="text-text">{formatDoctorOrderMoney(totalCents)}</dd>
          </div>
          {adminDiscountCents > 0 ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Descuento</dt>
              <dd className="text-text">-{formatDoctorOrderMoney(adminDiscountCents)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2 border-t border-border pt-1.5 text-base font-bold text-text">
            <dt>Total a cobrar</dt>
            <dd>{formatDoctorOrderMoney(finalTotalCents)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">
          El detalle de costos por producto es de uso exclusivo del médico.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cobro inicial Bs">
          <input
            className={internalInputClassName}
            name="initialPayment"
            inputMode="decimal"
            placeholder="0.00"
          />
        </Field>
        <PaymentMethodChips />
      </div>
      <Field label="Referencia">
        <input className={internalInputClassName} name="paymentReference" />
      </Field>

      <p className="text-xs text-muted">
        Pedido enviado por {doctorName}. Al confirmar se crea la venta; el saldo se cobra después en
        la venta.
      </p>
      <SubmitButton className="w-full">Confirmar y crear venta</SubmitButton>
    </ConfirmForm>
  );
}
