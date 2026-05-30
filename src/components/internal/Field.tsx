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
    <label className={cn("grid gap-2 text-sm font-semibold text-text", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export const internalInputClassName =
  "min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-55";
