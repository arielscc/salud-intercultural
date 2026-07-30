import { conversionPercent } from "@/features/patient-journey/report";

export function JourneyFunnel({
  stages
}: {
  stages: Array<{
    key: string;
    label: string;
    value: number;
    previousValue: number;
    loss: number;
  }>;
}) {
  const arrivals = stages[0]?.value ?? 0;
  return (
    <ol className="grid gap-2">
      {stages.map((stage, index) => {
        const width =
          arrivals > 0
            ? Math.max(conversionPercent(stage.value, arrivals), 3)
            : 0;
        const previousConversion =
          index === 0
            ? 100
            : conversionPercent(stage.value, stage.previousValue);
        return (
          <li key={stage.key} className="grid gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-text">
                {stage.label}
              </span>
              <span className="text-sm tabular-nums text-muted">
                <strong className="text-text">{stage.value}</strong>
                {index > 0
                  ? ` · ${previousConversion.toFixed(1)}% del paso anterior`
                  : ""}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${width}%` }}
              />
            </div>
            {index > 0 && stage.loss > 0 ? (
              <p className="text-xs text-warning">
                {stage.loss} visita{stage.loss === 1 ? "" : "s"} no avanzaron a
                este paso.
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

