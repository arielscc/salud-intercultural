"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Button } from "@/components/internal/ui/Button";

export type PaidStudyOption = {
  id: string;
  label: string;
  referenceCents: number;
};

export function PaidStudyOrderDialog({
  visitId,
  action,
  studies,
  compactTrigger = false,
  triggerLabel = "Derivar a enfermería"
}: {
  visitId: string;
  action: (formData: FormData) => Promise<void>;
  studies: PaidStudyOption[];
  compactTrigger?: boolean;
  triggerLabel?: string;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(studies.map((study) => [study.id, (study.referenceCents / 100).toFixed(2)]))
  );
  const [discount, setDiscount] = useState("0.00");

  const subtotal = useMemo(
    () =>
      studies.reduce(
        (sum, study) => sum + (selected[study.id] ? Number(prices[study.id]) || 0 : 0),
        0
      ),
    [prices, selected, studies]
  );
  const appliedDiscount = Math.min(Number(discount) || 0, subtotal);
  const total = Math.max(0, subtotal - appliedDiscount);
  const hasSelection = studies.some((study) => selected[study.id]);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant={compactTrigger ? "primary" : "outline"}
          size={compactTrigger ? "sm" : "md"}
          className={compactTrigger ? undefined : "w-full"}
        >
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(94vw,680px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[9px] border border-border bg-surface p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-sora text-lg font-bold text-text">
                Derivar a enfermería
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Selecciona los estudios del catálogo. La ficha pasará primero a Administración para el cobro.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="sm" className="h-9 w-9 px-0" title="Cerrar">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          {studies.length === 0 ? (
            <p className="mt-5 rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              No hay estudios activos en el catálogo. Pide a Administración que los cargue en
              “Catálogo”.
            </p>
          ) : (
            <form action={action} className="mt-5 grid gap-4">
              <input type="hidden" name="visitId" value={visitId} />
              <div className="grid gap-2">
                {studies.map((study) => {
                  const enabled = Boolean(selected[study.id]);
                  return (
                    <div
                      key={study.id}
                      className="grid grid-cols-[minmax(0,1fr)_120px] items-end gap-3 rounded-[7px] border border-border p-3"
                    >
                      <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-text">
                        <input
                          className="h-5 w-5 accent-primary"
                          type="checkbox"
                          aria-label={`Seleccionar ${study.label}`}
                          checked={enabled}
                          onChange={(event) =>
                            setSelected((current) => ({
                              ...current,
                              [study.id]: event.target.checked
                            }))
                          }
                        />
                        <span>
                          {study.label}
                          <span className="mt-0.5 block text-xs font-normal text-muted">
                            Referencia: {(study.referenceCents / 100).toFixed(2)} Bs
                          </span>
                        </span>
                      </label>
                      <Field label="Precio Bs">
                        <input
                          className={internalInputClassName}
                          inputMode="decimal"
                          aria-label={`Precio de ${study.label} en Bs`}
                          value={prices[study.id] ?? ""}
                          disabled={!enabled}
                          onChange={(event) =>
                            setPrices((current) => ({
                              ...current,
                              [study.id]: event.target.value
                            }))
                          }
                        />
                      </Field>
                      {enabled ? (
                        <>
                          <input type="hidden" name="studyCatalogItemId" value={study.id} />
                          <input type="hidden" name="studyPrice" value={prices[study.id] ?? ""} />
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <Field label="Indicaciones para Enfermería">
                <textarea className={`${internalInputClassName} min-h-20 py-3`} name="details" />
              </Field>

              <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                <Field label="Descuento Bs">
                  <input
                    className={internalInputClassName}
                    name="discount"
                    inputMode="decimal"
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                    required
                  />
                </Field>
                <dl className="grid content-center gap-1 text-sm tabular-nums">
                  <div className="flex justify-between gap-4"><dt className="text-muted">Subtotal</dt><dd>{subtotal.toFixed(2)} Bs</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Descuento</dt><dd>-{appliedDiscount.toFixed(2)} Bs</dd></div>
                  <div className="flex justify-between gap-4 border-t border-border pt-1 font-bold text-text"><dt>Total</dt><dd>{total.toFixed(2)} Bs</dd></div>
                </dl>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Dialog.Close asChild><Button type="button" variant="outline">Cancelar</Button></Dialog.Close>
                <SubmitButton disabled={!hasSelection}>Enviar orden a Administración</SubmitButton>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
