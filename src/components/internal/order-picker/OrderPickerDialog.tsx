"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, Minus, Pencil, Plus, Search, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Button } from "@/components/internal/ui/Button";
import { CollapsibleSection } from "@/components/internal/ui/CollapsibleSection";
import { cn } from "@/lib/cn";

export type OrderPickerItem = {
  /** Clave única de selección dentro del modal. */
  key: string;
  label: string;
  /** Encabezado bajo el que se agrupa (también alimenta los chips de filtro). */
  group: string;
  unitPriceCents: number;
  /** Distintivo corto, ej. "Receta"; también genera un chip de filtro propio. */
  badge?: string;
  /** Llega marcado al abrir el modal. */
  preselected?: boolean;
};

/** Estado editable de una línea elegida, tal como viaja al servidor. */
export type OrderPickerLine = {
  /** Precio unitario en texto ("45.00"), ya saneado. */
  price: string;
  quantity: number;
};

const ALL_FILTER = "__all__";
const BADGE_FILTER = "__badge__";

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

function formatBs(cents: number) {
  return `${(cents / 100).toFixed(2)} Bs`;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Selector de ítems para derivar al paciente (Enfermería o Administración).
 *
 * Pensado primero para el celular del médico: el nombre del ítem ocupa su propia
 * línea (antes se truncaba a ~27px entre los dos inputs), lo elegido sube a una
 * sección propia arriba, hay buscador con filtros por grupo, y el total y el
 * botón de envío viven en un pie fijo. Desde `sm` la fila vuelve a una sola línea.
 *
 * El modal no conoce el contrato del servidor: cada pantalla pasa sus `formFields`
 * (ocultos del formulario) y `lineFields` (ocultos por línea elegida).
 */
export function OrderPickerDialog({
  action,
  items,
  formFields,
  lineFields,
  totalFieldName,
  discountFieldName,
  notesFieldName,
  notesLabel,
  title,
  description,
  emptyMessage,
  triggerLabel,
  triggerIcon,
  compactTrigger = false,
  submitLabel,
  groupNotes,
  maxQuantity = 99,
  invalidPriceMessage = "Cada ítem seleccionado necesita un precio (usa 0.00 si es sin costo)."
}: {
  action: (formData: FormData) => Promise<void>;
  items: OrderPickerItem[];
  /** Ocultos propios del formulario (visitId, intent, workItemId…). */
  formFields?: ReactNode;
  /** Ocultos por cada línea elegida; define el contrato de la acción. */
  lineFields: (item: OrderPickerItem, line: OrderPickerLine) => ReactNode;
  /** Nombre del oculto con la base de cobro, ej. "total" o "chargeBase". */
  totalFieldName: string;
  /** Nombre del oculto con el descuento aplicado; siempre se envía. */
  discountFieldName: string;
  /** Nombre del textarea de indicaciones, ej. "details" o "indications". */
  notesFieldName: string;
  notesLabel: string;
  title: string;
  description: string;
  emptyMessage: string;
  triggerLabel: string;
  triggerIcon: ReactNode;
  compactTrigger?: boolean;
  submitLabel: string;
  /** Aclaración corta bajo el encabezado de un grupo. */
  groupNotes?: Record<string, string>;
  /** Tope de cantidad por línea; debe coincidir con el schema de la acción. */
  maxQuantity?: number;
  invalidPriceMessage?: string;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.filter((item) => item.preselected).map((item) => [item.key, true]))
  );
  const [qty, setQty] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((item) => [item.key, (item.unitPriceCents / 100).toFixed(2)]))
  );
  const [priceOpen, setPriceOpen] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(ALL_FILTER);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discount, setDiscount] = useState("0.00");
  const [totalStr, setTotalStr] = useState("");
  const [totalDirty, setTotalDirty] = useState(false);

  const chosen = items.filter((item) => selected[item.key]);
  const lineSumCents = chosen.reduce((sum, item) => {
    return sum + toCents(prices[item.key] ?? "0") * Math.max(1, qty[item.key] ?? 1);
  }, 0);

  const baseCents = totalDirty ? toCents(totalStr) : lineSumCents;
  const requestedDiscount = discountEnabled ? toCents(discount) : 0;
  // Descuento libre (sin tope): solo se acota al total para no dar negativo.
  const appliedDiscount = Math.min(Math.max(0, requestedDiscount), baseCents);
  const chargeCents = Math.max(0, baseCents - appliedDiscount);
  const hasSelection = chosen.length > 0;
  const hasInvalidPrice = chosen.some((item) => !isValidMoney(prices[item.key] ?? ""));

  const groups = useMemo(() => [...new Set(items.map((item) => item.group))], [items]);
  const badgeLabel = items.find((item) => item.badge)?.badge;
  const normalizedQuery = normalize(query);
  // El buscador y los chips solo aparecen cuando hay volumen que justifique el
  // espacio que ocupan en el celular (Recepción lista 6 estudios; Administración, 37).
  const showSearch = items.length >= 8;
  const showFilters = groups.length > 1 || Boolean(badgeLabel);

  // Lo elegido vive arriba (es el "carrito"): la búsqueda y los chips solo
  // filtran el catálogo de abajo para que nunca se pierda de vista.
  const available = items.filter((item) => {
    if (selected[item.key]) return false;
    if (filter === BADGE_FILTER && !item.badge) return false;
    if (filter !== ALL_FILTER && filter !== BADGE_FILTER && item.group !== filter) return false;
    if (normalizedQuery && !normalize(item.label).includes(normalizedQuery)) return false;
    return true;
  });
  const visibleGroups = groups.filter((group) => available.some((item) => item.group === group));

  function toggle(key: string) {
    const wasSelected = Boolean(selected[key]);
    setSelected((current) => ({ ...current, [key]: !current[key] }));
    // Un ítem sin precio de referencia (ej. recetado sin producto) abre el campo
    // de precio al elegirlo: no hay nada que confirmar, hay que escribirlo.
    if (!wasSelected && toCents(prices[key] ?? "0") === 0) {
      setPriceOpen((current) => ({ ...current, [key]: true }));
    }
  }

  function changeQuantity(key: string, delta: number) {
    setQty((current) => ({
      ...current,
      [key]: Math.min(maxQuantity, Math.max(1, (current[key] ?? 1) + delta))
    }));
  }

  function renderRow(item: OrderPickerItem) {
    const key = item.key;
    const enabled = Boolean(selected[key]);
    const price = prices[key] ?? "";
    const quantity = qty[key] ?? 1;
    const invalid = enabled && !isValidMoney(price);
    return (
      <div
        key={key}
        className={cn(
          "rounded-[9px] border p-3 transition",
          enabled ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border"
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* El nombre es el área táctil grande; los controles quedan fuera del
              botón para no anidar controles interactivos. */}
          <button
            type="button"
            role="checkbox"
            aria-checked={enabled}
            onClick={() => toggle(key)}
            className="focus-ring flex min-h-11 w-full min-w-0 flex-1 basis-full items-center gap-3 rounded-[7px] text-left sm:basis-0"
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-[6px] border",
                enabled ? "border-primary bg-primary text-white" : "border-border text-transparent"
              )}
              aria-hidden="true"
            >
              <Check size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-text">{item.label}</span>
              {item.badge ? (
                <span className="mt-0.5 inline-block rounded-[5px] bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-primary-dark">
                  {item.badge}
                </span>
              ) : null}
            </span>
            {enabled ? null : (
              <span className="shrink-0 text-sm tabular-nums text-muted">
                {item.unitPriceCents > 0 ? formatBs(item.unitPriceCents) : "Sin precio"}
              </span>
            )}
          </button>

          {enabled ? (
            <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
              <div className="flex items-center rounded-[7px] border border-border bg-surface">
                <button
                  type="button"
                  className="focus-ring flex size-11 items-center justify-center rounded-l-[7px] text-muted hover:text-text disabled:opacity-40 sm:size-9"
                  onClick={() => changeQuantity(key, -1)}
                  disabled={quantity <= 1}
                  aria-label={`Quitar una unidad de ${item.label}`}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  className="h-11 w-10 border-x border-border bg-transparent text-center text-sm font-semibold tabular-nums text-text focus:outline-none sm:h-9"
                  inputMode="numeric"
                  aria-label={`Cantidad de ${item.label}`}
                  value={quantity}
                  onChange={(event) =>
                    setQty((current) => ({
                      ...current,
                      [key]: Math.min(
                        maxQuantity,
                        Math.max(1, Number(event.target.value.replace(/\D/g, "")) || 1)
                      )
                    }))
                  }
                />
                <button
                  type="button"
                  className="focus-ring flex size-11 items-center justify-center rounded-r-[7px] text-muted hover:text-text sm:size-9"
                  onClick={() => changeQuantity(key, 1)}
                  aria-label={`Agregar una unidad de ${item.label}`}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {priceOpen[key] || invalid ? (
                <div className="w-24">
                  <input
                    className={cn(
                      internalInputClassName,
                      "px-2 text-right",
                      invalid && "border-error text-error focus:border-error focus:ring-error/10"
                    )}
                    inputMode="decimal"
                    autoFocus={priceOpen[key]}
                    aria-label={`Precio de ${item.label}`}
                    aria-invalid={invalid}
                    value={price}
                    onChange={(event) =>
                      setPrices((current) => ({
                        ...current,
                        [key]: sanitizeMoney(event.target.value)
                      }))
                    }
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="focus-ring flex min-h-11 items-center gap-1.5 rounded-[7px] px-2 text-sm tabular-nums text-text hover:text-primary-dark sm:min-h-9"
                  onClick={() => setPriceOpen((current) => ({ ...current, [key]: true }))}
                  aria-label={`Editar el precio de ${item.label}`}
                >
                  {formatBs(toCents(price))}
                  <Pencil className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : null}
        </div>

        {enabled ? lineFields(item, { price: price || "0", quantity }) : null}
      </div>
    );
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="primary"
          size={compactTrigger ? "sm" : "md"}
          className={
            compactTrigger ? "gap-2" : "min-h-16 w-full gap-2 text-[15px] font-semibold shadow-sm"
          }
        >
          {triggerIcon}
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" />
        {/* Móvil: hoja a pantalla completa. Desde `sm`: diálogo centrado. */}
        <Dialog.Content
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-surface",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[min(94vw,680px)]",
            "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[9px] sm:border sm:border-border sm:shadow-2xl"
          )}
        >
          {items.length === 0 ? (
            <div className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <Dialog.Title className="font-sora text-lg font-bold text-text">{title}</Dialog.Title>
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-9 w-9 px-0" title="Cerrar">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">{description}</Dialog.Description>
              <p className="rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                {emptyMessage}
              </p>
            </div>
          ) : (
            <form action={action} className="flex min-h-0 flex-1 flex-col">
              {formFields}
              <input type="hidden" name={totalFieldName} value={(baseCents / 100).toFixed(2)} />
              <input
                type="hidden"
                name={discountFieldName}
                value={(appliedDiscount / 100).toFixed(2)}
              />

              <header className="shrink-0 border-b border-border p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Dialog.Title className="font-sora text-lg font-bold text-text">
                      {title}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-muted max-sm:line-clamp-2">
                      {description}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-11 w-11 shrink-0 px-0 sm:h-9 sm:w-9"
                      title="Cerrar"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Dialog.Close>
                </div>

                <div className={cn("relative mt-3", !showSearch && "hidden")}>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    className={cn(internalInputClassName, "pl-9")}
                    type="search"
                    placeholder="Buscar producto o servicio…"
                    aria-label="Buscar en el catálogo"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    // Enter en el buscador no debe enviar la orden.
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault();
                    }}
                  />
                </div>

                <div className={cn("mt-2 flex flex-wrap gap-1.5", !showFilters && "hidden")}>
                  {[
                    { value: ALL_FILTER, label: "Todos" },
                    ...(badgeLabel ? [{ value: BADGE_FILTER, label: badgeLabel }] : []),
                    ...groups.map((group) => ({ value: group, label: group }))
                  ].map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      aria-pressed={filter === chip.value}
                      onClick={() => setFilter(chip.value)}
                      className={cn(
                        "focus-ring rounded-[7px] border px-2.5 py-1.5 text-xs font-semibold transition",
                        filter === chip.value
                          ? "border-primary bg-primary/10 text-primary-dark"
                          : "border-border text-muted hover:border-primary/40"
                      )}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                {hasSelection ? (
                  <section className="mb-4 grid gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                      Seleccionados ({chosen.length})
                    </p>
                    {chosen.map((item) => renderRow(item))}
                  </section>
                ) : null}

                {available.length === 0 ? (
                  <p className="rounded-[9px] border border-border px-4 py-6 text-center text-sm text-muted">
                    {hasSelection && !normalizedQuery
                      ? "No queda nada más para agregar con este filtro."
                      : "Ningún ítem coincide con la búsqueda."}
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {visibleGroups.map((group) => (
                      <section key={group} className="grid gap-2">
                        {groups.length > 1 ? (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                              {group}
                            </p>
                            {groupNotes?.[group] ? (
                              <p className="mt-0.5 text-xs text-muted">{groupNotes[group]}</p>
                            ) : null}
                          </div>
                        ) : null}
                        {available.filter((item) => item.group === group).map((item) => renderRow(item))}
                      </section>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-[13px] font-medium text-text">{notesLabel}</span>
                    <textarea
                      className={`${internalInputClassName} min-h-16 py-2`}
                      name={notesFieldName}
                    />
                  </label>

                  <CollapsibleSection
                    title="Ajustar descuento y total"
                    description="Opcional: el precio del catálogo ya viene aplicado."
                  >
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
                      <label className="grid gap-1.5">
                        <span className="text-[13px] font-medium text-text">Descuento Bs</span>
                        <input
                          className={internalInputClassName}
                          inputMode="decimal"
                          value={discount}
                          onChange={(event) => setDiscount(sanitizeMoney(event.target.value))}
                        />
                      </label>
                    ) : null}
                    <label className="grid gap-1.5">
                      <span className="text-[13px] font-medium text-text">Total Bs (editable)</span>
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
                    </label>
                    <dl className="grid gap-1 text-sm tabular-nums">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Suma de ítems</dt>
                        <dd>{formatBs(lineSumCents)}</dd>
                      </div>
                      {discountEnabled ? (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted">Descuento</dt>
                          <dd>-{formatBs(appliedDiscount)}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {totalDirty ? (
                      <button
                        type="button"
                        className="justify-self-start text-xs font-semibold text-primary-dark hover:underline"
                        onClick={() => {
                          setTotalDirty(false);
                          setTotalStr("");
                        }}
                      >
                        Recalcular total desde los ítems
                      </button>
                    ) : null}
                  </CollapsibleSection>
                </div>
              </div>

              <footer className="shrink-0 border-t border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
                {hasInvalidPrice ? (
                  <p className="mb-3 rounded-[7px] border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                    {invalidPriceMessage}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted">
                    <span className="font-semibold text-text">
                      {chosen.length} {chosen.length === 1 ? "ítem" : "ítems"}
                    </span>
                    {" · "}
                    <span className="font-bold tabular-nums text-text">{formatBs(chargeCents)}</span>
                  </p>
                  <div className="flex flex-1 justify-end gap-2 max-sm:w-full max-sm:flex-none">
                    <Dialog.Close asChild>
                      <Button type="button" variant="outline">
                        Cancelar
                      </Button>
                    </Dialog.Close>
                    <SubmitButton
                      className="max-sm:flex-1"
                      disabled={!hasSelection || hasInvalidPrice}
                    >
                      {submitLabel}
                    </SubmitButton>
                  </div>
                </div>
              </footer>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
