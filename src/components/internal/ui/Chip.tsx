import { cn } from "@/lib/cn";

const chipToneClassName = {
  neutral: "border border-border bg-background text-muted",
  primary: "bg-surface-soft text-primary-dark",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error"
} as const;

export function Chip({
  tone = "neutral",
  dot = false,
  className,
  children
}: {
  tone?: keyof typeof chipToneClassName;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        chipToneClassName[tone],
        className
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
