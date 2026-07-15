"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/internal/ui/Button";
import { internalInputClassName } from "@/components/internal/Field";
import { searchReceptionPatientsAction } from "@/features/reception/actions";
import { cn } from "@/lib/cn";

export type PatientSearchResult = Awaited<
  ReturnType<typeof searchReceptionPatientsAction>
>[number];

type PatientAutocompleteProps = {
  mode: "navigate" | "select";
  initialValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onSelect?: (patient: PatientSearchResult) => void;
  onCreateNew?: () => void;
};

export function PatientAutocomplete({
  mode,
  initialValue = "",
  value: controlledValue,
  onValueChange,
  onSelect,
  onCreateNew
}: PatientAutocompleteProps) {
  const router = useRouter();
  const listboxId = useId();
  const requestId = useRef(0);
  const [internalValue, setInternalValue] = useState(initialValue);
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = controlledValue ?? internalValue;

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 || !window.matchMedia("(max-width: 639px)").matches) return;

    const currentRequest = ++requestId.current;
    const timeout = window.setTimeout(async () => {
      try {
        const nextResults = await searchReceptionPatientsAction(term);
        if (currentRequest !== requestId.current) return;
        setResults(nextResults);
        setActiveIndex(nextResults.length > 0 ? 0 : -1);
        setIsOpen(true);
      } catch {
        if (currentRequest !== requestId.current) return;
        setResults([]);
        setActiveIndex(-1);
        setIsOpen(true);
      } finally {
        if (currentRequest === requestId.current) setIsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      requestId.current += 1;
    };
  }, [query]);

  function updateQuery(nextValue: string) {
    if (controlledValue === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);

    if (nextValue.trim().length < 2) {
      requestId.current += 1;
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);
  }

  function choosePatient(patient: PatientSearchResult) {
    setIsOpen(false);
    if (mode === "navigate") {
      router.push(`/sigeco/recepcion/pacientes/${patient.id}`);
      return;
    }
    onSelect?.(patient);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const patient = results[activeIndex];
      if (patient) choosePatient(patient);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  const showPanel = isOpen && query.trim().length >= 2;

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          className={cn(internalInputClassName, "pl-10 pr-10")}
          type="search"
          role="combobox"
          aria-label="Buscar paciente"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={
            showPanel && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Nombre, telefono o codigo"
          autoComplete="off"
          enterKeyHint="search"
        />
        {isLoading ? (
          <Loader2
            className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary-dark"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Pacientes encontrados"
          className="max-h-[min(17rem,35dvh)] overflow-y-auto rounded-[9px] border border-border bg-surface"
        >
          {isLoading ? (
            <p className="px-4 py-3 text-sm text-muted" role="status">
              Buscando pacientes...
            </p>
          ) : results.length > 0 ? (
            results.map((patient, index) => (
              <button
                key={patient.id}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={activeIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choosePatient(patient)}
                className={cn(
                  "focus-ring grid min-h-14 w-full gap-0.5 border-b border-border px-4 py-2.5 text-left last:border-b-0",
                  activeIndex === index && "bg-surface-soft"
                )}
              >
                <span className="truncate text-sm font-semibold text-text">{patient.fullName}</span>
                <span className="truncate text-[13px] tabular-nums text-muted">
                  {patient.internalCode} · {patient.phone}
                </span>
              </button>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-muted">No encontramos pacientes.</p>
          )}
        </div>
      ) : null}

      {onCreateNew ? (
        <Button type="button" onClick={onCreateNew} className="w-full">
          <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
          Es paciente nuevo
        </Button>
      ) : null}
    </div>
  );
}
