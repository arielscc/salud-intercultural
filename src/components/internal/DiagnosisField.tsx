"use client";

import { useMemo, useState } from "react";
import { Stethoscope } from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";

export type DiagnosisCatalogOption = {
  id: string;
  text: string;
};

/**
 * Campo de diagnóstico con buscador del catálogo de frecuentes. El médico escribe
 * 2+ letras y elige un diagnóstico del catálogo, o escribe uno nuevo libremente:
 * cada diagnóstico se guarda en el catálogo al guardar la consulta y crece con el
 * uso. Es un valor único (name="primaryDiagnosis"/"secondaryDiagnosis").
 */
export function DiagnosisField({
  name,
  defaultValue,
  catalog,
  required,
  placeholder
}: {
  name: string;
  defaultValue?: string | null;
  catalog: DiagnosisCatalogOption[];
  required?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);

  const trimmed = value.trim();
  const matches = useMemo(() => {
    const normalized = trimmed.toLowerCase();
    if (normalized.length < 2) return [];
    return catalog
      .filter(
        (option) =>
          option.text.toLowerCase().includes(normalized) &&
          option.text.trim().toLowerCase() !== normalized
      )
      .slice(0, 8);
  }, [catalog, trimmed]);

  return (
    <div className="relative">
      <input
        className={internalInputClassName}
        name={name}
        value={value}
        required={required}
        autoComplete="off"
        placeholder={placeholder ?? "Escribe o busca un diagnóstico"}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[9px] border border-border bg-surface shadow-lg">
          {matches.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-soft"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setValue(option.text);
                  setOpen(false);
                }}
              >
                <Stethoscope className="h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
                <span className="min-w-0">{option.text}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
