"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListPlus, Plus, X } from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";
import { ConfirmDialog } from "@/components/internal/ConfirmDialog";

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
  addMinLength = 2,
  onDeleteOption
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
  /** Longitud mínima para ofrecer "Agregar «…»" como entrada nueva. */
  addMinLength?: number;
  /** Si se pasa, cada opción del catálogo muestra una X para borrarla del catálogo. */
  onDeleteOption?: (id: string) => void | Promise<void>;
}) {
  const setValue = onValueChange;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<CatalogOption | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // El textarea crece según el contenido (una fila por indicación).
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  function confirmDelete() {
    const option = pendingDelete;
    setPendingDelete(null);
    if (!option || !onDeleteOption) return;
    setRemovedIds((current) => new Set(current).add(option.id));
    void onDeleteOption(option.id);
  }
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
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  }

  const trimmedQuery = query.trim();
  // Al enfocar (sin texto) se muestran todas las opciones disponibles; al escribir
  // se filtran. Se excluyen las que ya están agregadas en el textarea.
  const matches = useMemo(() => {
    const normalized = trimmedQuery.toLowerCase();
    const existing = new Set(
      value
        .split("\n")
        .map((line) => line.trim().toLowerCase())
        .filter(Boolean)
    );
    return catalog
      .filter(
        (option) =>
          !removedIds.has(option.id) &&
          !existing.has(option.text.trim().toLowerCase()) &&
          (normalized.length === 0 || option.text.toLowerCase().includes(normalized))
      )
      .slice(0, 50);
  }, [catalog, trimmedQuery, value, removedIds]);

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
  const canAddNew = trimmedQuery.length >= addMinLength && !exactMatch;

  return (
    <div className="grid gap-2">
      <div className="relative">
        <input
          className={query ? `${internalInputClassName} pr-9` : internalInputClassName}
          value={query}
          autoComplete="off"
          placeholder={searchPlaceholder}
          onChange={(event) => {
            setQuery(event.target.value);
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
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (matches.length > 0) appendLine(matches[0].text);
              else if (canAddNew) appendLine(trimmedQuery);
            }
          }}
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            title="Limpiar"
            onMouseDown={(event) => {
              event.preventDefault();
              setQuery("");
              cancelClose();
              setOpen(true);
            }}
            className="focus-ring absolute right-2 top-2.5 flex size-6 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-text"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
        {open && (matches.length > 0 || canAddNew) ? (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[9px] border border-border bg-surface shadow-lg">
            {matches.map((option) => (
              <li key={option.id} className="flex items-center">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-soft"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    appendLine(option.text);
                  }}
                >
                  <ListPlus className="h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
                  <span className="min-w-0">{option.text}</span>
                </button>
                {onDeleteOption ? (
                  <button
                    type="button"
                    aria-label={`Eliminar «${option.text}» del catálogo`}
                    title="Eliminar del catálogo"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setPendingDelete(option);
                    }}
                    className="focus-ring mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-error/10 hover:text-error"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
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
        className={`${internalInputClassName} min-h-24 resize-none overflow-hidden py-3`}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={textareaPlaceholder}
      />
      {value.trim() ? <p className="text-xs text-muted">{hint}</p> : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingDelete(null);
        }}
        title="Eliminar del catálogo"
        description={
          <>¿Eliminar «{pendingDelete?.text}» del catálogo? Dejará de aparecer en las sugerencias.</>
        }
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
