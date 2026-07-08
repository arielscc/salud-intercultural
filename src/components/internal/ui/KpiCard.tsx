import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const flagToneClassName = {
  warn: "bg-warning/10 text-warning",
  crit: "bg-error/10 text-error"
} as const;

export function KpiCard({
  label,
  value,
  note,
  flag,
  icon: Icon,
  className
}: {
  label: string;
  value: number | string;
  note?: string;
  flag?: { tone: keyof typeof flagToneClassName; label: string };
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-[9px] border border-border bg-surface p-[18px]",
        className
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        {label}
      </span>
      <span className="font-sora text-[26px] font-bold leading-tight tabular-nums text-text">
        {value}
      </span>
      {flag ? (
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
            flagToneClassName[flag.tone]
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {flag.label}
        </span>
      ) : note ? (
        <span className="text-[11px] text-muted/80">{note}</span>
      ) : null}
    </div>
  );
}
