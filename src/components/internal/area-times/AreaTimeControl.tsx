import { Clock3, PauseCircle, PlayCircle } from "lucide-react";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { Chip } from "@/components/internal/ui/Chip";
import { LiveElapsed } from "@/components/internal/area-times/LiveElapsed";
import { recordAreaTimeTransitionAction } from "@/features/area-times/actions";
import { AREA_WAIT_ALERT_MINUTES } from "@/features/area-times/report";
import { routeAreaLabels } from "@/features/patients/labels";

const phaseLabels = {
  waiting: "En espera",
  attention: "En atención",
  blocked: "Bloqueada"
} as const;

export type AreaTimeControlState = {
  visitId: string;
  area: keyof typeof routeAreaLabels;
  phase: keyof typeof phaseLabels;
  phaseStartedAt: Date;
  enteredAt: Date;
  inferred: boolean;
  blockReason: string | null;
};

export function AreaTimeControl({
  state,
  now = new Date(),
  compact = false
}: {
  state: AreaTimeControlState;
  now?: Date;
  compact?: boolean;
}) {
  const phaseElapsed = Math.max(
    0,
    now.getTime() - state.phaseStartedAt.getTime()
  );
  const waitAlert =
    state.phase === "waiting" &&
    phaseElapsed >= AREA_WAIT_ALERT_MINUTES * 60_000;

  return (
    <Card className={compact ? "p-4" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardHeader
          className="mb-0"
          title={`Tiempo en ${routeAreaLabels[state.area]}`}
          description="El tiempo se registra desde eventos, no desde estimaciones."
        />
        <Chip tone={waitAlert ? "warning" : state.phase === "blocked" ? "error" : "neutral"}>
          {phaseLabels[state.phase]}
        </Chip>
      </div>
      <div
        className={`mt-3 flex items-center gap-3 rounded-[9px] border p-3 ${
          waitAlert
            ? "border-warning/30 bg-warning/10"
            : "border-border bg-background"
        }`}
      >
        <Clock3
          className={`h-5 w-5 ${waitAlert ? "text-warning" : "text-primary-dark"}`}
          aria-hidden="true"
        />
        <div>
          <p className="text-xs text-muted">
            {state.phase === "waiting"
              ? "Tiempo esperando"
              : state.phase === "attention"
                ? "Tiempo en atención actual"
                : "Tiempo bloqueado actual"}
          </p>
          <p className="font-sora text-xl font-bold tabular-nums text-text">
            <LiveElapsed
              from={state.phaseStartedAt.toISOString()}
              initialNow={now.toISOString()}
            />
          </p>
        </div>
      </div>
      {waitAlert ? (
        <p className="mt-2 text-xs font-medium text-warning">
          Superó el aviso inicial de {AREA_WAIT_ALERT_MINUTES} minutos. Revisa
          si el paciente puede avanzar o necesita una explicación.
        </p>
      ) : null}
      {state.inferred ? (
        <p className="mt-2 text-xs text-muted">
          Esta sesión comenzó antes de activar la medición detallada.
        </p>
      ) : null}
      {state.blockReason ? (
        <p className="mt-2 text-xs text-muted">
          Motivo del bloqueo: {state.blockReason}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2">
        {state.phase === "waiting" ? (
          <NoticeForm
            action={recordAreaTimeTransitionAction}
            notice="Atención iniciada"
          >
            <input type="hidden" name="visitId" value={state.visitId} />
            <input type="hidden" name="action" value="start_attention" />
            <SubmitButton size="sm" className="w-full">
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Iniciar atención
            </SubmitButton>
          </NoticeForm>
        ) : null}
        {state.phase === "blocked" ? (
          <NoticeForm
            action={recordAreaTimeTransitionAction}
            notice="Atención reanudada"
          >
            <input type="hidden" name="visitId" value={state.visitId} />
            <input type="hidden" name="action" value="resume" />
            <SubmitButton size="sm" className="w-full">
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Reanudar
            </SubmitButton>
          </NoticeForm>
        ) : (
          <details className="rounded-[9px] border border-border">
            <summary className="focus-ring cursor-pointer rounded-[9px] px-3 py-2 text-sm font-semibold text-muted">
              Registrar un bloqueo
            </summary>
            <NoticeForm
              action={recordAreaTimeTransitionAction}
              notice="Bloqueo registrado"
              className="grid gap-2 border-t border-border p-3"
            >
              <input type="hidden" name="visitId" value={state.visitId} />
              <input type="hidden" name="action" value="block" />
              <Field label="Motivo breve">
                <input
                  className={internalInputClassName}
                  name="reason"
                  placeholder="Ej.: espera de un estudio"
                  minLength={3}
                  maxLength={240}
                  required
                />
              </Field>
              <SubmitButton size="sm" variant="outline">
                <PauseCircle className="h-4 w-4" aria-hidden="true" />
                Marcar como bloqueada
              </SubmitButton>
            </NoticeForm>
          </details>
        )}
      </div>
    </Card>
  );
}
