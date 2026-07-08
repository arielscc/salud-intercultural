import { cn } from "@/lib/cn";

export function Field({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5 text-[13px] font-medium text-text", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export const internalInputClassName =
  "min-h-11 w-full rounded-[9px] border border-border bg-surface px-3.5 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-55";
