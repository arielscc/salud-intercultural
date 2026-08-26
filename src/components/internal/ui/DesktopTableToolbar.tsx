import { cn } from "@/lib/cn";

export function DesktopTableToolbar({
  views,
  filters,
  count,
  actions,
  className
}: {
  views?: React.ReactNode;
  filters?: React.ReactNode;
  count?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "hidden min-h-14 items-center gap-3 border-y border-border bg-surface px-3.5 py-2 lg:flex",
        className
      )}
      aria-label="Herramientas de la bandeja"
    >
      {views ? <div className="flex shrink-0 items-center gap-1.5">{views}</div> : null}
      {views && filters ? <span className="h-6 w-px shrink-0 bg-border" aria-hidden="true" /> : null}
      {filters ? <div className="flex min-w-0 flex-1 items-center gap-2">{filters}</div> : null}
      {!filters ? <div className="flex-1" /> : null}
      {count ? (
        <p className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted" aria-live="polite">
          {count}
        </p>
      ) : null}
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </section>
  );
}

