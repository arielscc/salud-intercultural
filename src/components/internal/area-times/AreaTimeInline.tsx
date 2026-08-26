import { Clock3, PlayCircle } from "lucide-react";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Chip } from "@/components/internal/ui/Chip";
import { LiveElapsed } from "@/components/internal/area-times/LiveElapsed";
import type { AreaTimeControlState } from "@/components/internal/area-times/AreaTimeControl";
import { recordAreaTimeTransitionAction } from "@/features/area-times/actions";
import { AREA_WAIT_ALERT_MINUTES } from "@/features/area-times/report";
import { cn } from "@/lib/cn";

const phaseLabels = {
  waiting: "En espera",
  attention: "En atención",
  blocked: "Bloqueada"
} as const;

/**
 * Versión de una línea del cronómetro de área: fase y tiempo transcurrido, sin la
 * tarjeta ni el registro de bloqueos. Pensada para acompañar la cabecera del
 * paciente en la consulta, donde el médico solo necesita ver cuánto lleva.
 *
 * Conserva "Reanudar" cuando la visita está bloqueada: sin ese botón, una visita
 * bloqueada no tendría salida desde esta pantalla.
 */
export function AreaTimeInline({
  state,
  now = new Date(),
  className
}: {
  state: AreaTimeControlState;
  now?: Date;
  className?: string;
}) {
  const phaseElapsed = Math.max(0, now.getTime() - state.phaseStartedAt.getTime());
  const waitAlert =
    state.phase === "waiting" && phaseElapsed >= AREA_WAIT_ALERT_MINUTES * 60_000;

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      <Chip
        tone={waitAlert ? "warning" : state.phase === "blocked" ? "error" : "neutral"}
      >
        {phaseLabels[state.phase]}
      </Chip>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums",
          waitAlert ? "text-warning" : "text-text"
        )}
        title={`Tiempo en ${phaseLabels[state.phase].toLocaleLowerCase("es-BO")}`}
      >
        <Clock3
          className={cn("h-4 w-4", waitAlert ? "text-warning" : "text-primary-dark")}
          aria-hidden="true"
        />
        <LiveElapsed
          from={state.phaseStartedAt.toISOString()}
          initialNow={now.toISOString()}
        />
      </span>
      {state.phase === "blocked" ? (
        <NoticeForm action={recordAreaTimeTransitionAction} notice="Atención reanudada">
          <input type="hidden" name="visitId" value={state.visitId} />
          <input type="hidden" name="action" value="resume" />
          <SubmitButton size="sm" variant="outline">
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Reanudar
          </SubmitButton>
        </NoticeForm>
      ) : null}
    </div>
  );
}
