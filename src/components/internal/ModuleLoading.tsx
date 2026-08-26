import { Card } from "@/components/internal/ui/Card";
import { Skeleton } from "@/components/internal/ui/Skeleton";
import { cn } from "@/lib/cn";

function LoadingHeader({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-44 sm:w-56" />
        <Skeleton className="h-4 w-56 max-w-[70vw] sm:w-72" />
      </div>
      {actions > 0 ? (
        <div className="flex gap-2">
          {Array.from({ length: actions }, (_, index) => (
            <Skeleton key={index} className="h-9 w-28 flex-1 sm:flex-none" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoadingKpis({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="grid min-h-[92px] gap-2 rounded-[9px] border border-border bg-surface p-2.5 sm:min-h-[132px] sm:p-[18px]"
        >
          <Skeleton className="h-7 w-7 sm:h-9 sm:w-9" />
          <Skeleton className="h-6 w-10 sm:h-8 sm:w-14" />
          <Skeleton className="h-3 w-full max-w-28" />
        </div>
      ))}
    </div>
  );
}

function LoadingList({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="p-0">
      <div className="border-b border-border px-[18px] py-4">
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid min-h-[76px] gap-2 px-[18px] py-3 sm:grid-cols-4 sm:items-center">
            <Skeleton className="h-4 w-2/3 sm:w-32" />
            <Skeleton className="h-3 w-1/2 sm:w-24" />
            <Skeleton className="h-3 w-1/3 sm:w-20" />
            <Skeleton className="hidden h-6 w-20 justify-self-end sm:block" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ModuleLoading({
  kpis = 0,
  actions = 1,
  rows = 5,
  sidePanel = false
}: {
  kpis?: number;
  actions?: number;
  rows?: number;
  sidePanel?: boolean;
}) {
  return (
    <div className="grid gap-4" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Cargando contenido</span>
      <LoadingHeader actions={actions} />
      {kpis > 0 ? <LoadingKpis count={kpis} /> : null}
      <div className={cn("grid items-start gap-4", sidePanel && "xl:grid-cols-[1.4fr_0.6fr]")}>
        <LoadingList rows={rows} />
        {sidePanel ? (
          <Card className="grid gap-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32 justify-self-end" />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
