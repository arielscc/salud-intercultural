"use client";

import { useMemo, useRef, useState } from "react";
import { ListPlus, Plus } from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";

export type IndicationCatalogOption = {
  id: string;
  text: string;
};

/**
 * Campo de indicaciones con buscador del catálogo de frecuentes. El médico escribe
 * (ej. "agua") y elige una indicación completa (ej. "Tomar 2 litros de agua al día"),
 * que se agrega como una línea. También puede escribir libremente: cada indicación
 * nueva se guarda en el catálogo al guardar la consulta. El textarea acumula una
 * indicación por línea y es lo que viaja al server (name="indications").
 */
export function IndicationField({
  name,
  defaultValue,
  catalog
}: {
  name: string;
  defaultValue?: string | null;
  catalog: IndicationCatalogOption[];
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmedQuery = query.trim();
  const matches = useMemo(() => {
    const normalized = trimmedQuery.toLowerCase();
    if (normalized.length < 3) return [];
    const existing = new Set(
      value
        .split("\n")
        .map((line) => line.trim().toLowerCase())
        .filter(Boolean)
    );
    return catalog
      .filter(
        (option) =>
          option.text.toLowerCase().includes(normalized) &&
          !existing.has(option.text.trim().toLowerCase())
      )
      .slice(0, 8);
  }, [catalog, trimmedQuery, value]);

  function appendLine(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setValue((current) => {
      const base = current.replace(/\s+$/, "");
      return base ? `${base}\n${clean}` : clean;
    });
    setQuery("");
    setOpen(false);
    textareaRef.current?.focus();
  }

  const exactMatch = catalog.some(
    (option) => option.text.trim().toLowerCase() === trimmedQuery.toLowerCase()
  );
  const canAddNew = trimmedQuery.length >= 3 && !exactMatch;

  return (
    <div className="grid gap-2">
      <div className="relative">
        <div className="flex gap-2">
          <input
            className={internalInputClassName}
            value={query}
            autoComplete="off"
            placeholder="Busca una indicación frecuente (ej. agua) o escribe una nueva"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (matches.length > 0) appendLine(matches[0].text);
                else if (canAddNew) appendLine(trimmedQuery);
              }
            }}
          />
        </div>
        {open && (matches.length > 0 || canAddNew) ? (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[9px] border border-border bg-surface shadow-lg">
            {matches.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-soft"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    appendLine(option.text);
                  }}
                >
                  <ListPlus className="h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
                  <span className="min-w-0">{option.text}</span>
                </button>
              </li>
            ))}
            {canAddNew ? (
              <li>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-muted hover:bg-surface-soft"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    appendLine(trimmedQuery);
                  }}
                >
                  <Plus className="h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
                  <span className="min-w-0">
                    Agregar «{trimmedQuery}» como nueva indicación
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <textarea
        ref={textareaRef}
        className={`${internalInputClassName} min-h-28 py-3`}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Una indicación por línea. Puedes editarlas libremente."
      />
      {value.trim() ? (
        <p className="text-xs text-muted">
          Cada indicación se guarda en el catálogo para reutilizarla después.
        </p>
      ) : null}
    </div>
  );
}
