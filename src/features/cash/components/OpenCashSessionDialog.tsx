"use client";

import { useState } from "react";
import { Banknote, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Button } from "@/components/internal/ui/Button";
import { cashShiftLabels } from "@/features/cash/labels";
import { cn } from "@/lib/cn";

type Person = {
  id: string;
  name: string | null;
  email: string;
};

type OpenCashSessionDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  branchCode: string;
  branchName: string;
  registerName: string;
  businessDate: string;
  businessDateLabel: string;
  responsibles: Person[];
  defaultResponsibleId: string;
  requiresExceptionalOpen: boolean;
  returnTo: string;
  idempotencyKey: string;
  /** Se abre solo cuando el cobro se rechazó por falta de Caja. */
  defaultOpen?: boolean;
  triggerLabel?: string;
  triggerClassName?: string;
};

function personName(person: Person) {
  return person.name ?? person.email;
}

/**
 * Apertura de Caja desde la propia pantalla de cobro: el modal trae los mismos
 * campos de "Control de Caja" y, al guardar, devuelve al cobro que quedó a medias.
 */
export function OpenCashSessionDialog({
  action,
  branchCode,
  branchName,
  registerName,
  businessDate,
  businessDateLabel,
  responsibles,
  defaultResponsibleId,
  requiresExceptionalOpen,
  returnTo,
  idempotencyKey,
  defaultOpen = false,
  triggerLabel,
  triggerClassName
}: OpenCashSessionDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const label =
    triggerLabel ??
    (requiresExceptionalOpen ? "Abrir Caja excepcional" : "Abrir la Caja de hoy");

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" className={triggerClassName}>
          <Banknote className="h-4 w-4" aria-hidden="true" />
          {label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-3 top-1/2 z-50 max-h-[calc(100dvh-2rem)] -translate-y-1/2 overflow-hidden rounded-[9px] border border-border bg-surface shadow-2xl",
            "sm:left-1/2 sm:right-auto sm:w-[min(94vw,620px)] sm:-translate-x-1/2"
          )}
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-primary/10 text-primary-dark">
                <Banknote className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <Dialog.Title className="font-sora text-lg font-bold text-text">
                  {requiresExceptionalOpen
                    ? "Abrir Caja excepcional de hoy"
                    : "Abrir la Caja de hoy"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  {requiresExceptionalOpen
                    ? "Ya hubo un cierre hoy. Esta apertura suma al día en curso y queda marcada para auditoría."
                    : "Los cobros solo se registran con la Caja del día abierta. Al abrirla vuelves aquí para completar el cobro."}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 px-0"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </header>

          <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto p-4 sm:p-5">
            <dl className="mb-4 grid gap-2 rounded-[9px] border border-border bg-background px-3.5 py-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-2 sm:block">
                <dt className="text-xs font-medium text-muted">Sucursal</dt>
                <dd className="font-semibold text-text sm:mt-0.5">{branchName}</dd>
              </div>
              <div className="flex justify-between gap-2 sm:block">
                <dt className="text-xs font-medium text-muted">Fecha de trabajo</dt>
                <dd className="font-semibold tabular-nums text-text sm:mt-0.5">
                  {businessDateLabel}
                </dd>
              </div>
            </dl>

            <form action={action} className="grid gap-3">
              <input type="hidden" name="branchCode" value={branchCode} />
              <input type="hidden" name="businessDate" value={businessDate} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
              {requiresExceptionalOpen ? (
                <input type="hidden" name="exceptional" value="true" />
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Caja">
                  <input
                    className={internalInputClassName}
                    name="registerName"
                    defaultValue={registerName}
                    required
                  />
                </Field>
                <Field label="Turno">
                  <select
                    className={internalInputClassName}
                    name="shift"
                    defaultValue="full_day"
                  >
                    {Object.entries(cashShiftLabels).map(([value, shiftLabel]) => (
                      <option key={value} value={value}>
                        {shiftLabel}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Responsable">
                  <select
                    className={internalInputClassName}
                    name="responsibleId"
                    defaultValue={defaultResponsibleId}
                    required
                  >
                    <option value="">Seleccionar</option>
                    {responsibles.map((person) => (
                      <option key={person.id} value={person.id}>
                        {personName(person)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Efectivo inicial Bs">
                  <input
                    className={internalInputClassName}
                    name="openingCash"
                    inputMode="decimal"
                    placeholder="0.00"
                    defaultValue="0.00"
                    required
                  />
                </Field>
              </div>

              {requiresExceptionalOpen ? (
                <Field label="Motivo de apertura excepcional">
                  <textarea
                    className={`${internalInputClassName} min-h-20 py-3`}
                    name="exceptionalReason"
                    placeholder="Ej. Venta posterior al cierre ordinario; paciente llegó a las 18:20."
                    required
                  />
                </Field>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Dialog.Close>
                <SubmitButton pendingLabel="Abriendo Caja…">
                  {requiresExceptionalOpen ? "Abrir Caja excepcional" : "Abrir Caja"}
                </SubmitButton>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
