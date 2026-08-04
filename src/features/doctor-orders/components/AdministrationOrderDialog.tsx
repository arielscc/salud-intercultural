"use client";

import { useState } from "react";
import { Check, Receipt, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Button } from "@/components/internal/ui/Button";
import { formatDoctorOrderMoney } from "@/features/doctor-orders/labels";
import { cn } from "@/lib/cn";

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

// Vacío es inválido; "0" y "0.00" son válidos.
function isValidMoney(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}

export function AdministrationOrderDialog({
  visitId,
  action,
  options,
  triggerLabel = "Derivar a administración"
}: {
  visitId: string;
  action: (formData: FormData) => Promise<void>;
  options: AdministrationOrderOption[];
  triggerLabel?: string;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(options.map((o) => [optionKey(o), (o.unitPriceCents / 100).toFixed(2)]))
  );
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discount, setDiscount] = useState("0.00");
  const [totalStr, setTotalStr] = useState("");
  const [totalDirty, setTotalDirty] = useState(false);

  const chosen = options.filter((o) => selected[optionKey(o)]);
  const lineSumCents = chosen.reduce((sum, o) => {
    const key = optionKey(o);
    return sum + toCents(prices[key] ?? "0") * Math.max(1, qty[key] ?? 1);
  }, 0);

  const baseCents = totalDirty ? toCents(totalStr) : lineSumCents;
  const requestedDiscount = discountEnabled ? toCents(discount) : 0;
  // Descuento libre (sin tope): solo se acota al total para no dar negativo.
  const appliedDiscount = Math.min(Math.max(0, requestedDiscount), baseCents);
  const chargeCents = Math.max(0, baseCents - appliedDiscount);
  const hasSelection = chosen.length > 0;
  const hasInvalidPrice = chosen.some((o) => !isValidMoney(prices[optionKey(o)] ?? ""));

  function toggle(key: string) {
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  }

  const groups = [...new Set(options.map((o) => o.group))];

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="primary"
          className="min-h-16 w-full gap-2 text-[15px] font-semibold shadow-sm"
        >
          <Receipt className="h-5 w-5" aria-hidden="true" />
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(94vw,680px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[9px] border border-border bg-surface p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-sora text-lg font-bold text-text">
                Derivar a administración
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Toca una tarjeta para agregarla. Se envía a Administración para el cobro; el médico
                no cobra.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="sm" className="h-9 w-9 px-0" title="Cerrar">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          {options.length === 0 ? (
            <p className="mt-5 rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              No hay tratamientos, productos ni consultas activos en el catálogo.
            </p>
          ) : (
            <form action={action} className="mt-5 grid gap-4">
              <input type="hidden" name="visitId" value={visitId} />
              <input type="hidden" name="intent" value="submit" />
              <input type="hidden" name="chargeBase" value={(baseCents / 100).toFixed(2)} />
              <input
                type="hidden"
                name="orderDiscount"
                value={(appliedDiscount / 100).toFixed(2)}
              />

              <div className="grid gap-3">
                {groups.map((group) => (
                  <div key={group} className="grid gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {group}
                    </p>
                    {options
                      .filter((o) => o.group === group)
                      .map((o) => {
                        const key = optionKey(o);
                        const enabled = Boolean(selected[key]);
                        return (
                          <div
                            key={key}
                            role="button"
                            tabIndex={0}
                            aria-pressed={enabled}
                            onClick={(event) => {
                              // Toda la fila alterna, salvo al tocar un control activo.
                              if (
                                (event.target as HTMLElement).closest(
                                  "input, textarea, select, button, label"
                                )
                              ) {
                                return;
                              }
                              toggle(key);
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggle(key);
                              }
                            }}
                            className={cn(
                              "focus-ring flex cursor-pointer items-center gap-3 rounded-[9px] border p-3 transition",
                              enabled
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "border-border hover:border-primary/40"
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-[6px] border",
                                enabled
                                  ? "border-primary bg-primary text-white"
                                  : "border-border text-transparent"
                              )}
                              aria-hidden="true"
                            >
                              <Check size={14} />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                              {o.label}
                            </span>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className="text-[11px] font-medium text-muted">Cant.</span>
                              <div className="w-16">
                                <input
                                  className={cn(
                                    internalInputClassName,
                                    "px-2 text-center",
                                    !enabled && "pointer-events-none opacity-55"
                                  )}
                                  type="number"
                                  min="1"
                                  step="1"
                                  aria-label={`Cantidad de ${o.label}`}
                                  readOnly={!enabled}
                                  tabIndex={enabled ? undefined : -1}
                                  value={qty[key] ?? 1}
                                  onChange={(event) =>
                                    setQty((current) => ({
                                      ...current,
                                      [key]: Number(event.target.value) || 1
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className="text-[11px] font-medium text-muted">Bs</span>
                              <div className="w-24">
                                <input
                                  className={cn(
                                    internalInputClassName,
                                    "px-2 text-right",
                                    !enabled && "pointer-events-none opacity-55",
                                    enabled &&
                                      !isValidMoney(prices[key] ?? "") &&
                                      "border-error text-error focus:border-error focus:ring-error/10"
                                  )}
                                  inputMode="decimal"
                                  aria-label={`Precio de ${o.label} (médico)`}
                                  aria-invalid={enabled && !isValidMoney(prices[key] ?? "")}
                                  readOnly={!enabled}
                                  tabIndex={enabled ? undefined : -1}
                                  value={prices[key] ?? ""}
                                  onChange={(event) =>
                                    setPrices((current) => ({
                                      ...current,
                                      [key]: sanitizeMoney(event.target.value)
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            {enabled ? (
                              <>
                                <input type="hidden" name="lineSource" value={o.source} />
                                <input type="hidden" name="lineCatalogItemId" value={o.catalogItemId ?? ""} />
                                <input type="hidden" name="lineInventoryItemId" value={o.inventoryItemId ?? ""} />
                                <input type="hidden" name="lineDescription" value={o.label} />
                                <input type="hidden" name="lineUnitPrice" value={prices[key] ?? "0"} />
                                <input type="hidden" name="lineQuantity" value={qty[key] ?? 1} />
                                <input type="hidden" name="lineDiscount" value="0" />
                                <input type="hidden" name="lineSessionCount" value="" />
                                <input type="hidden" name="linePricingMode" value="" />
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>

              <Field label="Indicaciones para Administración (opcional)">
                <textarea className={`${internalInputClassName} min-h-16 py-2`} name="indications" />
              </Field>

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

              <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 sm:items-end">
                <Field label="Total Bs (editable)">
                  <input
                    className={internalInputClassName}
                    inputMode="decimal"
                    aria-label="Total editable"
                    value={totalDirty ? totalStr : (lineSumCents / 100).toFixed(2)}
                    onChange={(event) => {
                      setTotalDirty(true);
                      setTotalStr(sanitizeMoney(event.target.value));
                    }}
                  />
                </Field>
                <dl className="grid content-center gap-1 text-sm tabular-nums">
                  <div className="flex justify-between gap-4"><dt className="text-muted">Suma de productos</dt><dd>{formatDoctorOrderMoney(lineSumCents)}</dd></div>
                  {discountEnabled ? (
                    <div className="flex justify-between gap-4"><dt className="text-muted">Descuento</dt><dd>-{formatDoctorOrderMoney(appliedDiscount)}</dd></div>
                  ) : null}
                  <div className="flex justify-between gap-4 border-t border-border pt-1 font-bold text-text"><dt>Total a cobrar</dt><dd>{formatDoctorOrderMoney(chargeCents)}</dd></div>
                </dl>
              </div>
              {hasInvalidPrice ? (
                <p className="rounded-[7px] border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                  Cada producto seleccionado necesita un precio (usa 0.00 si es sin costo).
                </p>
              ) : null}
              {totalDirty ? (
                <button
                  type="button"
                  className="justify-self-start text-xs font-semibold text-primary-dark hover:underline"
                  onClick={() => {
                    setTotalDirty(false);
                    setTotalStr("");
                  }}
                >
                  Recalcular total desde los productos
                </button>
              ) : null}

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Dialog.Close asChild><Button type="button" variant="outline">Cancelar</Button></Dialog.Close>
                <SubmitButton disabled={!hasSelection || hasInvalidPrice}>
                  Enviar a Administración
                </SubmitButton>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
