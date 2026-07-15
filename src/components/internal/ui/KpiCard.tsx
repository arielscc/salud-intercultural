import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const flagToneClassName = {
  warn: "bg-warning/10 text-warning",
  crit: "bg-error/10 text-error"
} as const;

const flagDotClassName = {
  warn: "bg-warning",
  crit: "bg-error"
} as const;

const iconToneClassName = {
  primary: "bg-primary/10 text-primary-dark",
  "primary-dark": "bg-primary-dark/10 text-primary-dark",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
  error: "bg-error/10 text-error",
  muted: "bg-muted/10 text-muted"
} as const;

export type KpiTone = keyof typeof iconToneClassName;

export function KpiCard({
  label,
  value,
  note,
  flag,
  icon: Icon,
  tone = "primary",
  className
}: {
  label: string;
  value: number | string;
  note?: string;
  flag?: { tone: keyof typeof flagToneClassName; label: string };
  icon?: LucideIcon;
  tone?: KpiTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-[9px] border border-border bg-surface p-2.5 sm:gap-2 sm:p-[18px]",
        className
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "relative flex h-7 w-7 items-center justify-center rounded-[7px] sm:h-9 sm:w-9 sm:rounded-[9px]",
            iconToneClassName[tone]
          )}
        >
          <Icon className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
          {flag ? (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-surface sm:hidden",
                flagDotClassName[flag.tone]
              )}
              aria-hidden="true"
            />
          ) : null}
        </span>
      ) : null}
      <div>
        <span className="block font-sora text-lg font-bold leading-tight tabular-nums text-text sm:text-[26px]">
          {value}
        </span>
        <span className="mt-0.5 block text-[10.5px] font-medium leading-tight text-muted sm:text-xs">
          {label}
        </span>
      </div>
      {flag ? (
        <>
          <span className="sr-only sm:hidden">Alerta: {flag.label}</span>
          <span
            className={cn(
              "hidden w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold sm:inline-flex",
              flagToneClassName[flag.tone]
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {flag.label}
          </span>
        </>
      ) : note ? (
        <span className="hidden text-[11px] text-muted/80 sm:block">{note}</span>
      ) : null}
    </div>
  );
}
