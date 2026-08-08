"use client";

import { useMemo, useRef, useState } from "react";
import { Info, Pill, Plus, RotateCcw, X } from "lucide-react";
import { ChipOption } from "@/components/internal/ChipOption";
import { internalInputClassName } from "@/components/internal/Field";
import { Button } from "@/components/internal/ui/Button";
import { cn } from "@/lib/cn";

export type MedicationOption = {
  id: string;
  name: string;
  currentStock: number;
};

export type PrescriptionEditorItem = {
  inventoryItemId: string | null;
  medication: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  observations: string | null;
};

// Input más bajo para densificar el editor de receta (mantiene el resto del estilo).
const compactInputClassName = internalInputClassName.replace("min-h-11", "min-h-9");

const FREQUENCY_OPTIONS = [
  "Cada 6 horas",
  "Cada 8 horas",
  "Cada 12 horas",
  "Cada 24 horas",
  "Una vez al día",
  "Antes de dormir"
];
const DURATION_OPTIONS = ["3 días", "5 días", "7 días", "10 días", "14 días"];

type Row = {
  key: string;
  inventoryItemId: string | null;
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  observations: string;
  frequencyOther: boolean;
  durationOther: boolean;
};

/** Compara nombres de medicamento sin tildes, mayúsculas ni espacios repetidos. */
function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

let rowSeq = 0;
function newKey() {
  rowSeq += 1;
  return `rx-${Date.now()}-${rowSeq}`;
}

function toRow(item: PrescriptionEditorItem): Row {
  const frequency = item.frequency ?? "";
  const duration = item.duration ?? "";
  return {
    key: newKey(),
    inventoryItemId: item.inventoryItemId,
    medication: item.medication,
    dose: item.dose ?? "",
    frequency,
    duration,
    observations: item.observations ?? "",
    frequencyOther: Boolean(frequency) && !FREQUENCY_OPTIONS.includes(frequency),
    durationOther: Boolean(duration) && !DURATION_OPTIONS.includes(duration)
  };
}

function emptyRow(): Row {
  return {
    key: newKey(),
    inventoryItemId: null,
    medication: "",
    dose: "",
    frequency: "",
    duration: "",
    observations: "",
    frequencyOther: false,
    durationOther: false
  };
}

export function PrescriptionEditor({
  medications,
  previousItems,
  initialItems
}: {
  medications: MedicationOption[];
  previousItems: PrescriptionEditorItem[];
  initialItems: PrescriptionEditorItem[];
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialItems.length > 0 ? initialItems.map(toRow) : []
  );

  // JSON que consume el server action (solo filas con medicamento).
  const payload = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((row) => row.medication.trim().length > 0)
          .map((row) => ({
            inventoryItemId: row.inventoryItemId,
            medication: row.medication.trim(),
            dose: row.dose.trim() || undefined,
            frequency: row.frequency.trim() || undefined,
            duration: row.duration.trim() || undefined,
            observations: row.observations.trim() || undefined
          }))
      ),
    [rows]
  );

  // Nombres de medicamento repetidos (para avisar antes de guardar).
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row.medication.trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set(
      [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key)
    );
  }, [rows]);
  const hasDuplicates = duplicateKeys.size > 0;

  function update(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }
  function remove(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name="prescriptionItems" value={payload} />

      <div className="flex flex-wrap gap-2">
        {previousItems.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setRows(previousItems.map(toRow))}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Repetir receta anterior
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[9px] border border-dashed border-border px-3 py-4 text-center text-sm text-muted">
          Sin medicamentos. Agrega uno solo si indicas medicación.
        </p>
      ) : null}

      <div className="grid gap-3">
        {rows.map((row, index) => (
          <PrescriptionRow
            key={row.key}
            row={row}
            index={index}
            medications={medications}
            duplicate={
              row.medication.trim().length > 0 &&
              duplicateKeys.has(row.medication.trim().toLowerCase())
            }
            onChange={(patch) => update(row.key, patch)}
            onRemove={() => remove(row.key)}
          />
        ))}
      </div>

      {hasDuplicates ? (
        <p className="rounded-[9px] border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Hay medicamentos repetidos. Quita los duplicados antes de guardar.
        </p>
      ) : null}

      <div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="gap-1.5"
          onClick={() => setRows((current) => [...current, emptyRow()])}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar medicamento
        </Button>
      </div>
    </div>
  );
}

function PrescriptionRow({
  row,
  index,
  medications,
  duplicate,
  onChange,
  onRemove
}: {
  row: Row;
  index: number;
  medications: MedicationOption[];
  duplicate: boolean;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Cierre diferido en blur; se cancela al reenfocar para que un clic no lo apague.
  const closeTimer = useRef<number | null>(null);
  function cancelClose() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  }
  // Solo medicinas con stock; al enfocar se listan todas y se filtran al escribir.
  const matches = useMemo(() => {
    const query = row.medication.trim().toLowerCase();
    const inStock = medications.filter((option) => option.currentStock > 0);
    if (query.length === 0) return inStock;
    return inStock.filter((option) => option.name.toLowerCase().includes(query));
  }, [medications, row.medication]);

  // Escrito a mano y sin equivalente en el inventario: la clínica no lo vende, así
  // que no aparecerá para cobrar al derivar a Administración. Solo se avisa.
  const externalMedication = useMemo(() => {
    if (row.inventoryItemId) return false;
    const name = normalizeName(row.medication);
    if (!name) return false;
    return !medications.some((option) => normalizeName(option.name) === name);
  }, [medications, row.inventoryItemId, row.medication]);

  return (
    <div
      className={cn(
        "rounded-[9px] border bg-background p-2.5",
        duplicate ? "border-error/50" : "border-border"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text">
          <Pill className="h-3.5 w-3.5 text-primary-dark" aria-hidden="true" />
          Medicamento {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar medicamento"
          title="Quitar medicamento"
          className="focus-ring flex size-6 items-center justify-center rounded-full text-muted transition hover:bg-error/10 hover:text-error"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-2.5">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <label className="grid gap-1 text-[12px] font-medium text-muted">
              <span>Medicamento</span>
              <div className="relative">
                <input
                  className={
                    row.medication ? `${compactInputClassName} pr-9` : compactInputClassName
                  }
                  value={row.medication}
                  autoComplete="off"
                  placeholder="Busca en inventario o escríbelo"
                  onChange={(event) => {
                    onChange({ medication: event.target.value, inventoryItemId: null });
                    cancelClose();
                    setOpen(true);
                  }}
                  onFocus={() => {
                    cancelClose();
                    setOpen(true);
                  }}
                  onMouseDown={() => {
                    // Alterna: un segundo clic cierra el desplegable.
                    cancelClose();
                    setOpen((current) => !current);
                  }}
                  onBlur={scheduleClose}
                />
                {row.medication ? (
                  <button
                    type="button"
                    aria-label="Limpiar medicamento"
                    title="Limpiar"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onChange({ medication: "", inventoryItemId: null });
                      cancelClose();
                      setOpen(true);
                    }}
                    className="focus-ring absolute right-2 top-1.5 flex size-6 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-text"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </label>
            {open ? (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[9px] border border-border bg-surface shadow-lg">
                {matches.length > 0 ? (
                  matches.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-soft"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          onChange({ medication: option.name, inventoryItemId: option.id });
                          setOpen(false);
                        }}
                      >
                        <span className="min-w-0 truncate text-text">{option.name}</span>
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-success">
                          Stock {option.currentStock}
                        </span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-muted">
                    {row.medication.trim().length > 0
                      ? "Sin coincidencias en stock. Se usará el texto escrito."
                      : "No hay medicinas con stock disponible."}
                  </li>
                )}
              </ul>
            ) : null}
            {duplicate ? (
              <p className="mt-1 text-[12px] text-error">Medicamento repetido.</p>
            ) : null}
            {externalMedication && !duplicate ? (
              <p className="mt-1 inline-flex items-start gap-1 text-[12px] text-muted">
                <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                No está en el inventario: el paciente lo compra en farmacia y no se
                cobra aquí.
              </p>
            ) : null}
          </div>

          <label className="grid gap-1 text-[12px] font-medium text-muted">
            <span>Dosis</span>
            <input
              className={compactInputClassName}
              value={row.dose}
              placeholder="Ej. 500 mg"
              onChange={(event) => onChange({ dose: event.target.value })}
            />
          </label>
        </div>

        <ChipSelect
          label="Frecuencia"
          options={FREQUENCY_OPTIONS}
          value={row.frequency}
          other={row.frequencyOther}
          onSelect={(value) => onChange({ frequency: value, frequencyOther: false })}
          onOther={() => onChange({ frequency: "", frequencyOther: true })}
          onOtherChange={(value) => onChange({ frequency: value })}
        />

        <ChipSelect
          label="Duración"
          options={DURATION_OPTIONS}
          value={row.duration}
          other={row.durationOther}
          onSelect={(value) => onChange({ duration: value, durationOther: false })}
          onOther={() => onChange({ duration: "", durationOther: true })}
          onOtherChange={(value) => onChange({ duration: value })}
        />

        <label className="grid gap-1 text-[12px] font-medium text-muted">
          <span>Observaciones (opcional)</span>
          <input
            className={compactInputClassName}
            value={row.observations}
            placeholder="Ej. tomar con alimentos"
            onChange={(event) => onChange({ observations: event.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

function ChipSelect({
  label,
  options,
  value,
  other,
  onSelect,
  onOther,
  onOtherChange
}: {
  label: string;
  options: string[];
  value: string;
  other: boolean;
  onSelect: (value: string) => void;
  onOther: () => void;
  onOtherChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <ChipOption
            key={option}
            selected={!other && value === option}
            onClick={() => onSelect(value === option && !other ? "" : option)}
          >
            {option}
          </ChipOption>
        ))}
        <ChipOption selected={other} onClick={onOther}>
          Otro
        </ChipOption>
      </div>
      {other ? (
        <input
          className={compactInputClassName}
          value={value}
          onChange={(event) => onOtherChange(event.target.value)}
          placeholder={`Especifica la ${label.toLowerCase()}`}
          aria-label={`Otra ${label.toLowerCase()}`}
          autoFocus
        />
      ) : null}
    </div>
  );
}
