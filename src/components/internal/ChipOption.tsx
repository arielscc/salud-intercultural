"use client";

import { cn } from "@/lib/cn";

/*
 * Cápsula (chip) seleccionable de uso global en las pantallas internas:
 * mismo aspecto en recepción, enfermería y donde se necesite una opción
 * tipo "pill" con estado activo/inactivo.
 */
export function ChipOption({
  selected,
  onClick,
  children
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "focus-ring inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition",
        selected
          ? "border-primary bg-surface-soft text-primary-dark"
          : "border-border bg-surface text-muted hover:border-primary/40 hover:text-text"
      )}
    >
      {children}
    </button>
  );
}
