import { formatDateOnly } from "@/lib/dates";

export function JourneyTrend({
  points
}: {
  points: Array<{
    date: string;
    arrivals: number;
    consultations: number;
    visitsWithSale: number;
    collectedCents: number;
  }>;
}) {
  const visible = points.slice(-31);
  const maximum = Math.max(
    1,
    ...visible.flatMap((point) => [
      point.arrivals,
      point.consultations,
      point.visitsWithSale
    ])
  );

  if (visible.length === 0) {
    return <p className="text-sm text-muted">No hay días con visitas en este período.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <Legend color="bg-primary" label="Llegadas" />
        <Legend color="bg-secondary" label="Consultas" />
        <Legend color="bg-accent" label="Con compra" />
      </div>
      <div
        className="grid min-h-52 items-end gap-1 overflow-x-auto pb-2"
        style={{
          gridTemplateColumns: `repeat(${visible.length}, minmax(24px, 1fr))`
        }}
        role="img"
        aria-label="Tendencia diaria de llegadas, consultas y visitas con compra"
      >
        {visible.map((point) => (
          <div
            key={point.date}
            className="group flex min-w-6 flex-col items-center justify-end gap-1"
            title={`${point.date}: ${point.arrivals} llegadas, ${point.consultations} consultas, ${point.visitsWithSale} con compra`}
          >
            <div className="flex h-40 w-full items-end justify-center gap-px">
              <Bar value={point.arrivals} maximum={maximum} color="bg-primary" />
              <Bar
                value={point.consultations}
                maximum={maximum}
                color="bg-secondary"
              />
              <Bar
                value={point.visitsWithSale}
                maximum={maximum}
                color="bg-accent"
              />
            </div>
            <span className="hidden whitespace-nowrap text-[9px] tabular-nums text-muted group-first:block group-last:block sm:group-hover:block">
              {formatDateOnly(new Date(`${point.date}T00:00:00.000Z`))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({
  value,
  maximum,
  color
}: {
  value: number;
  maximum: number;
  color: string;
}) {
  return (
    <span
      className={`block min-h-0 w-1/3 rounded-t-sm ${color}`}
      style={{ height: `${(value / maximum) * 100}%` }}
      aria-hidden="true"
    />
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

