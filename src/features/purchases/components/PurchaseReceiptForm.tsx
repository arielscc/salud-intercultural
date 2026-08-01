"use client";

import { useState } from "react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import {
  DatePickerField,
  DateTimePickerField
} from "@/components/internal/ui/DatePickerField";

type PendingLine = {
  id: string;
  description: string;
  unit: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCostCents: number;
};

function ReceiptLineFields({ line }: { line: PendingLine }) {
  const [expirationDate, setExpirationDate] = useState("");
  const pending = line.orderedQuantity - line.receivedQuantity;
  return (
    <div className="grid gap-3 rounded-[9px] border border-border p-3 lg:grid-cols-5">
      <input type="hidden" name="purchaseLineId" value={line.id} />
      <input type="hidden" name="expirationDate" value={expirationDate} />
      <div className="lg:col-span-5">
        <strong className="text-sm text-text">{line.description}</strong>
        <span className="ml-2 text-xs text-muted">
          Pedido {line.orderedQuantity} · recibido {line.receivedQuantity} · pendiente {pending}{" "}
          {line.unit}
        </span>
      </div>
      <Field label="Recibir ahora">
        <input
          className={internalInputClassName}
          name="quantity"
          type="number"
          inputMode="numeric"
          min="0"
          max={pending}
          defaultValue="0"
          required
        />
      </Field>
      <Field label="Costo real Bs">
        <input
          className={internalInputClassName}
          name="unitCost"
          inputMode="decimal"
          defaultValue={(line.unitCostCents / 100).toFixed(2)}
          required
        />
      </Field>
      <Field label="Número de lote">
        <input className={internalInputClassName} name="batchNumber" />
      </Field>
      <Field label="Vencimiento">
        <DatePickerField
          value={expirationDate}
          onChange={setExpirationDate}
          fromYear={2026}
          toYear={2045}
          disableFuture={false}
          placeholder="Sin vencimiento"
        />
      </Field>
      <div className="flex items-end">
        <span className="pb-3 text-xs text-muted">FEFO usará la fecha más próxima.</span>
      </div>
    </div>
  );
}

export function PurchaseReceiptForm({
  action,
  purchaseId,
  lines,
  people,
  idempotencyKey,
  branchCode
}: {
  action: (formData: FormData) => void | Promise<void>;
  purchaseId: string;
  lines: PendingLine[];
  people: Array<{ id: string; name: string | null; email: string }>;
  idempotencyKey: string;
  branchCode: string;
}) {
  return (
    <form action={action} className="grid gap-4" encType="multipart/form-data">
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <input type="hidden" name="branchCode" value={branchCode} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <Card>
        <CardHeader
          title="1. Recepción"
          description="Indica quién recibió, cuándo y dónde quedó guardado."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fecha y hora">
            <DateTimePickerField name="receivedAt" required />
          </Field>
          <Field label="Persona que recibió">
            <select className={internalInputClassName} name="receivedById" required>
              <option value="">Selecciona</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name ?? person.email}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ubicación">
            <input
              className={internalInputClassName}
              name="locationCode"
              placeholder="Ej. Almacén principal"
              required
            />
          </Field>
          <Field label="Documento de recepción">
            <input className={internalInputClassName} name="documentNumber" />
          </Field>
          <Field label="Fotografía o PDF" className="sm:col-span-2">
            <input
              className={internalInputClassName}
              type="file"
              name="document"
              accept=".pdf,image/jpeg,image/png,image/webp"
              capture="environment"
            />
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader
          title="2. Cantidades y lotes"
          description="Deja cero en una línea que todavía no llegó."
        />
        <div className="grid gap-3">
          {lines.map((line) => <ReceiptLineFields key={line.id} line={line} />)}
        </div>
      </Card>
      <Card>
        <Field label="Notas">
          <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
        </Field>
        <SubmitButton className="mt-3 w-full sm:w-auto">
          Confirmar recepción y aumentar stock
        </SubmitButton>
      </Card>
    </form>
  );
}
