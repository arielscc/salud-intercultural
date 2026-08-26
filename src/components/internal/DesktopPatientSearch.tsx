"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { PatientSearchResult } from "@/components/internal/reception/PatientAutocomplete";
import { searchReceptionPatientsAction } from "@/features/reception/actions";
import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const desktopMediaQuery = "(min-width: 1024px)";

export function DesktopPatientSearch() {
  const router = useRouter();
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        window.matchMedia(desktopMediaQuery).matches
      ) {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 2 || !window.matchMedia(desktopMediaQuery).matches) return;

    const currentRequest = ++requestId.current;
    const timeout = window.setTimeout(async () => {
      try {
        const nextResults = await searchReceptionPatientsAction(term);
        if (currentRequest !== requestId.current) return;
        setResults(nextResults);
        setActiveIndex(nextResults.length > 0 ? 0 : -1);
      } catch {
        if (currentRequest !== requestId.current) return;
        setResults([]);
        setActiveIndex(-1);
      } finally {
        if (currentRequest === requestId.current) setIsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      requestId.current += 1;
    };
  }, [open, query]);

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);

    if (nextQuery.trim().length < 2) {
      requestId.current += 1;
      setResults([]);
      setIsLoading(false);
      setActiveIndex(-1);
      return;
    }

    setIsLoading(true);
  }

  function closeSearch() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setIsLoading(false);
    setActiveIndex(-1);
    requestId.current += 1;
  }

  function choosePatient(patient: PatientSearchResult) {
    closeSearch();
    router.push(`/sigeco/recepcion/pacientes/${patient.id}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
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
      event.preventDefault();
      closeSearch();
    }
  }

  const showResults = query.trim().length >= 2;

  return (
    <div className="hidden min-w-0 flex-1 lg:block">
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setOpen(true);
          else closeSearch();
        }}
      >
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className="focus-ring flex h-9 w-full max-w-[360px] items-center gap-2 rounded-[7px] border border-border bg-background px-3 text-left text-xs text-muted transition hover:border-primary/40 hover:text-text"
            aria-label="Buscar paciente"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">Buscar paciente</span>
            <kbd className="rounded-[5px] border border-border bg-surface px-1.5 py-0.5 font-sans text-[10px] leading-none text-muted">
              Ctrl K
            </kbd>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[min(30rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0 shadow-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <div className="relative border-b border-border">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-label="Buscar paciente por nombre, teléfono o código"
              aria-autocomplete="list"
              aria-expanded={showResults}
              aria-controls={listboxId}
              aria-activedescendant={
                showResults && activeIndex >= 0
                  ? `${listboxId}-option-${activeIndex}`
                  : undefined
              }
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nombre, teléfono o código"
              autoComplete="off"
              className="h-11 w-full bg-surface pl-10 pr-10 text-sm text-text outline-none placeholder:text-muted"
            />
            {isLoading ? (
              <Loader2
                className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary-dark"
                aria-hidden="true"
              />
            ) : null}
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label="Pacientes encontrados"
            className="max-h-72 overflow-y-auto"
          >
            {!showResults ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Escribe al menos 2 caracteres.
              </p>
            ) : isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-muted" role="status">
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
                  <span className="truncate text-sm font-semibold text-text">
                    {patient.fullName}
                  </span>
                  <span className="truncate text-xs tabular-nums text-muted">
                    {patient.internalCode} · {patient.phone}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted">
                No encontramos pacientes.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

