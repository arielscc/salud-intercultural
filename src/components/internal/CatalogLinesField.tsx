"use client";

import { useMemo, useRef, useState } from "react";
import { ListPlus, Plus } from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";

export type CatalogOption = {
  id: string;
  text: string;
};

/**
 * Campo de texto por líneas con buscador de un catálogo de frecuentes. El médico
 * escribe unas letras y elige una opción del catálogo (se agrega como una línea), o
 * escribe una nueva libremente. Cada entrada se guarda en el catálogo al guardar la
 * consulta y el catálogo crece con el uso. El textarea acumula una entrada por línea
 * y es lo que viaja al server (name=...). Es controlado (value/onValueChange) para
 * que las plantillas por diagnóstico puedan agregarle líneas.
 *
 * Genérico: lo usan Indicaciones, Hallazgos y Observaciones cambiando el copy.
 */
export function CatalogLinesField({
  name,
  value,
  onValueChange,
  catalog,
  itemNoun,
  searchPlaceholder,
  textareaPlaceholder,
  hint,
  minQueryLength = 3
}: {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  catalog: CatalogOption[];
  /** Sustantivo para los textos, ej. "indicación", "hallazgo", "observación". */
  itemNoun: string;
  searchPlaceholder: string;
  textareaPlaceholder: string;
  hint: string;
  minQueryLength?: number;
}) {
  const setValue = onValueChange;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmedQuery = query.trim();
  const matches = useMemo(() => {
    const normalized = trimmedQuery.toLowerCase();
    if (normalized.length < minQueryLength) return [];
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
  }, [catalog, trimmedQuery, value, minQueryLength]);

  function appendLine(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const base = value.replace(/\s+$/, "");
    setValue(base ? `${base}\n${clean}` : clean);
    setQuery("");
    setOpen(false);
    textareaRef.current?.focus();
  }

  const exactMatch = catalog.some(
    (option) => option.text.trim().toLowerCase() === trimmedQuery.toLowerCase()
  );
  const canAddNew = trimmedQuery.length >= minQueryLength && !exactMatch;

  return (
    <div className="grid gap-2">
      <div className="relative">
        <input
          className={internalInputClassName}
          value={query}
          autoComplete="off"
          placeholder={searchPlaceholder}
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
                    Agregar «{trimmedQuery}» como {itemNoun}
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <textarea
        ref={textareaRef}
        className={`${internalInputClassName} min-h-24 py-3`}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={textareaPlaceholder}
      />
      {value.trim() ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
