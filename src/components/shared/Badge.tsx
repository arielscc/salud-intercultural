import { cn } from "@/lib/cn";

export function Badge({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-primary/15 bg-surface/80 px-3 py-1 text-xs font-semibold text-primary-dark shadow-sm",
        className
      )}
    >
      {children}
    </span>
  );
}
