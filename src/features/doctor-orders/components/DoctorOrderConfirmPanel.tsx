"use client";

import { useState } from "react";
import type { DoctorOrderLineSource } from "@/generated/prisma/client";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { PaymentMethodChips } from "@/components/internal/PaymentMethodChips";
import { SubmitButton } from "@/components/internal/SubmitButton";
import {
  doctorOrderLineSourceLabels,
  doctorOrderLineTotalCents,
  formatDoctorOrderMoney
} from "@/features/doctor-orders/labels";
import { cn } from "@/lib/cn";

type ConfirmLine = {
  id: string;
  source: DoctorOrderLineSource;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  maxDiscountCents: number;
};

type DoctorOrderConfirmPanelProps = {
  action: (formData: FormData) => Promise<void>;
  orderId: string;
  workItemId: string;
  patientName: string;
  lines: ConfirmLine[];
  indications: string | null;
  doctorName: string;
};

export function DoctorOrderConfirmPanel({
  action,
  orderId,
  workItemId,
  patientName,
  lines,
  indications,
  doctorName
}: DoctorOrderConfirmPanelProps) {
  const subtotalCents = lines.reduce(
    (total, line) => total + line.unitPriceCents * line.quantity,
    0
  );
  const requestedDiscountCents = lines.reduce(
    (total, line) => total + Math.min(line.discountCents, line.maxDiscountCents),
    0
  );
  const capCents = lines.reduce((total, line) => total + line.maxDiscountCents, 0);
  const hasDiscount = requestedDiscountCents > 0;

  const [approveDiscount, setApproveDiscount] = useState(true);
  const appliedDiscountCents = approveDiscount ? requestedDiscountCents : 0;
  const totalCents = Math.max(0, subtotalCents - appliedDiscountCents);

  return (
    <ConfirmForm
      action={action}
      notice="Venta creada desde el pedido del médico"
      confirmTitle="Confirmar pedido y crear venta"
      confirmDescription={`Se creará la venta de ${patientName} por ${formatDoctorOrderMoney(
        totalCents
      )}${hasDiscount ? (approveDiscount ? " (descuento aprobado)" : " (descuento rechazado, precio completo)") : ""}. El cobro se registra en Caja.`}
      confirmLabel="Confirmar y crear venta"
      confirmAtAllWidths
      className="grid gap-4"
    >
      <input type="hidden" name="doctorOrderId" value={orderId} />
      <input type="hidden" name="workItemId" value={workItemId} />
      <input type="hidden" name="approveDiscount" value={String(approveDiscount)} />

      <div className="grid gap-2">
        {lines.map((line) => (
          <div key={line.id} className="rounded-[9px] border border-border px-3 py-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-semibold text-text">{line.description}</span>
              <span className="tabular-nums text-text">
                {formatDoctorOrderMoney(doctorOrderLineTotalCents(line))}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {doctorOrderLineSourceLabels[line.source]} · {line.quantity} ×{" "}
              {formatDoctorOrderMoney(line.unitPriceCents)}
              {line.discountCents > 0
                ? ` · desc. ${formatDoctorOrderMoney(line.discountCents)} (tope ${formatDoctorOrderMoney(line.maxDiscountCents)})`
                : ""}
            </p>
          </div>
        ))}
      </div>

      {indications ? (
        <p className="rounded-[9px] bg-surface-soft px-3 py-2 text-sm text-muted">{indications}</p>
      ) : null}

      {hasDiscount ? (
        <fieldset className="grid gap-2 rounded-[9px] border border-border p-3">
          <legend className="px-1 text-sm font-semibold text-text">
            Validar descuento pedido por el paciente
          </legend>
          <p className="text-xs text-muted">
            El médico aplicó {formatDoctorOrderMoney(requestedDiscountCents)} de descuento (tope{" "}
            {formatDoctorOrderMoney(capCents)}). Administración aprueba o rechaza.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="approveDiscountChoice"
              checked={approveDiscount}
              onChange={() => setApproveDiscount(true)}
            />
            Aprobar descuento ({formatDoctorOrderMoney(requestedDiscountCents)})
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="approveDiscountChoice"
              checked={!approveDiscount}
              onChange={() => setApproveDiscount(false)}
            />
            Rechazar descuento (cobrar precio completo)
          </label>
        </fieldset>
      ) : null}

      <div className="rounded-[9px] border border-border bg-background p-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted">Subtotal</span>
          <span className="tabular-nums text-text">{formatDoctorOrderMoney(subtotalCents)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2">
          <span className="text-muted">Descuento aplicado</span>
          <span className="tabular-nums text-text">
            − {formatDoctorOrderMoney(appliedDiscountCents)}
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-2 border-t border-border pt-1">
          <span className="font-semibold text-text">Total a cobrar</span>
          <strong className="tabular-nums text-text">{formatDoctorOrderMoney(totalCents)}</strong>
        </div>
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

      <p className={cn("text-xs text-muted")}>
        Pedido armado por {doctorName}. Al confirmar se crea la venta con líneas; el saldo se cobra
        después en la venta.
      </p>
      <SubmitButton className="w-full">Confirmar y crear venta</SubmitButton>
    </ConfirmForm>
  );
}
