"use client";

import { useMemo, useState } from "react";
import { Pill, Plus, RotateCcw, X } from "lucide-react";
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
            onChange={(patch) => update(row.key, patch)}
            onRemove={() => remove(row.key)}
          />
        ))}
      </div>

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
  onChange,
  onRemove
}: {
  row: Row;
  index: number;
  medications: MedicationOption[];
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const query = row.medication.trim().toLowerCase();
    if (query.length < 1) return medications.slice(0, 8);
    return medications
      .filter((option) => option.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [medications, row.medication]);

  return (
    <div className="rounded-[9px] border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-text">
          <Pill className="h-4 w-4 text-primary-dark" aria-hidden="true" />
          Medicamento {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar medicamento"
          title="Quitar medicamento"
          className="focus-ring flex size-7 items-center justify-center rounded-full text-muted transition hover:bg-error/10 hover:text-error"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3">
        <div className="relative">
          <label className="grid gap-1.5 text-[13px] font-medium text-text">
            <span>Medicamento</span>
            <input
              className={internalInputClassName}
              value={row.medication}
              autoComplete="off"
              placeholder="Busca en inventario o escríbelo"
              onChange={(event) => {
                onChange({ medication: event.target.value, inventoryItemId: null });
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            />
          </label>
          {open && matches.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[9px] border border-border bg-surface shadow-lg">
              {matches.map((option) => (
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
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                        option.currentStock > 0
                          ? "bg-success/10 text-success"
                          : "bg-error/10 text-error"
                      )}
                    >
                      Stock {option.currentStock}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <label className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>Dosis</span>
          <input
            className={internalInputClassName}
            value={row.dose}
            placeholder="Ej. 500 mg, 1 tableta"
            onChange={(event) => onChange({ dose: event.target.value })}
          />
        </label>

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

        <label className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>Observaciones (opcional)</span>
          <input
            className={internalInputClassName}
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
    <div className="grid gap-1.5">
      <span className="text-[13px] font-medium text-text">{label}</span>
      <div className="flex flex-wrap gap-2">
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
          className={internalInputClassName}
          value={value}
          onChange={(event) => onOtherChange(event.target.value)}
          placeholder={`Especifica la ${label.toLowerCase()}`}
          aria-label={`Otra ${label.toLowerCase()}`}
        />
      ) : null}
    </div>
  );
}
