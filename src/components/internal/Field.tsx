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
  const required = label.trimEnd().endsWith("*");
  const labelText = required ? label.trimEnd().slice(0, -1).trimEnd() : label;

  return (
    <label className={cn("grid gap-1.5 text-[13px] font-medium text-text", className)}>
      <span>
        {labelText}
        {required ? (
          <span className="ml-1 text-base font-black leading-none text-error" aria-label="obligatorio">
            *
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export const internalInputClassName =
  "min-h-11 w-full rounded-[9px] border border-border bg-surface px-3.5 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-55";
