"use client";

import { useMemo, useRef, useState } from "react";
import { Stethoscope, X } from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";

export type DiagnosisCatalogOption = {
  id: string;
  text: string;
  planTemplate?: string | null;
  indicationsTemplate?: string | null;
};

/**
 * Campo de diagnóstico con buscador del catálogo de frecuentes. El médico escribe
 * 2+ letras y elige un diagnóstico del catálogo, o escribe uno nuevo libremente:
 * cada diagnóstico se guarda en el catálogo al guardar la consulta y crece con el
 * uso. Es un valor único (name="primaryDiagnosis"/"secondaryDiagnosis").
 *
 * Si el diagnóstico elegido tiene plantilla, avisa por `onApplyTemplate` para que
 * el contenedor agregue (sin sobrescribir) el plan e indicaciones sugeridos.
 */
export function DiagnosisField({
  name,
  defaultValue,
  catalog,
  required,
  placeholder,
  onApplyTemplate
}: {
  name: string;
  defaultValue?: string | null;
  catalog: DiagnosisCatalogOption[];
  required?: boolean;
  placeholder?: string;
  onApplyTemplate?: (template: {
    plan?: string | null;
    indications?: string | null;
  }) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
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
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  }

  const trimmed = value.trim();
  // Al enfocar (sin texto) se listan todos los diagnósticos; al escribir se filtran.
  // Se oculta el que ya coincide exactamente con lo escrito.
  const matches = useMemo(() => {
    const normalized = trimmed.toLowerCase();
    return catalog
      .filter(
        (option) =>
          option.text.trim().toLowerCase() !== normalized &&
          (normalized.length === 0 || option.text.toLowerCase().includes(normalized))
      )
      .slice(0, 50);
  }, [catalog, trimmed]);

  return (
    <div className="relative">
      <input
        className={value ? `${internalInputClassName} pr-9` : internalInputClassName}
        name={name}
        value={value}
        required={required}
        autoComplete="off"
        placeholder={placeholder ?? "Escribe o busca un diagnóstico"}
        onChange={(event) => {
          setValue(event.target.value);
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
      {value ? (
        <button
          type="button"
          aria-label="Limpiar diagnóstico"
          title="Limpiar"
          onMouseDown={(event) => {
            event.preventDefault();
            setValue("");
            cancelClose();
            setOpen(true);
          }}
          className="focus-ring absolute right-2 top-2.5 flex size-6 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-text"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[9px] border border-border bg-surface shadow-lg">
          {matches.length > 0 ? (
            matches.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-soft"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setValue(option.text);
                    setOpen(false);
                    if (
                      onApplyTemplate &&
                      (option.planTemplate || option.indicationsTemplate)
                    ) {
                      onApplyTemplate({
                        plan: option.planTemplate,
                        indications: option.indicationsTemplate
                      });
                    }
                  }}
                >
                  <Stethoscope className="h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
                  <span className="min-w-0">{option.text}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted">
              {trimmed.length > 0
                ? "Sin coincidencias. Se usará el texto escrito."
                : "No hay diagnósticos en el catálogo."}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
