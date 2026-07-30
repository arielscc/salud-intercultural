import type { VisitPendingType } from "@/generated/prisma/client";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  visitDiscontinuationReasonOptions,
  visitPendingTypeOptions
} from "@/features/visit-discontinuations/labels";
import { recordVisitDiscontinuationAction } from "@/features/visit-discontinuations/actions";
import { cn } from "@/lib/cn";

export function VisitDiscontinuationForm({
  visitId,
  patientName,
  defaultPendingTypes = [],
  compact = false
}: {
  visitId: string;
  patientName: string;
  defaultPendingTypes?: VisitPendingType[];
  compact?: boolean;
}) {
  const defaults = new Set(defaultPendingTypes);

  return (
    <ConfirmForm
      id="no-continuara"
      action={recordVisitDiscontinuationAction}
      notice="Abandono registrado"
      confirmTitle="Registrar que no continuará"
      confirmDescription={`La visita de ${patientName} se cerrará como abandono. Las tareas y órdenes abiertas quedarán bloqueadas y visibles para su recuperación.`}
      confirmLabel="Registrar abandono"
      confirmAtAllWidths
      className={cn("grid gap-3", compact && "gap-2.5")}
    >
      <input type="hidden" name="visitId" value={visitId} />

      <Field label="Motivo obligatorio">
        <select
          className={internalInputClassName}
          name="reason"
          defaultValue=""
          required
        >
          <option value="" disabled>
            Selecciona un motivo
          </option>
          {visitDiscontinuationReasonOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-text">
          ¿Qué queda pendiente?
        </legend>
        <p className="text-xs text-muted">
          SIGECO también agregará los pendientes que detecte en la visita.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {visitPendingTypeOptions.map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[9px] border border-border bg-surface px-3 py-2 text-sm text-text"
            >
              <Checkbox
                name="pendingTypes"
                value={value}
                defaultChecked={defaults.has(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-[9px] border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-text">
        <Checkbox name="createFollowUp" className="mt-0.5" />
        <span>
          <span className="block font-semibold">
            Crear seguimiento de recuperación
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Solo se creará si existe consentimiento vigente. Se asignará a
            Marlen; nunca a Yazmin.
          </span>
        </span>
      </label>

      <Field label="Nota opcional">
        <textarea
          className={`${internalInputClassName} min-h-20 py-3`}
          name="note"
          maxLength={500}
          placeholder="Ej. esperó 40 minutos y volverá mañana"
        />
      </Field>

      <SubmitButton
        variant="outline"
        className="w-full border-error/30 text-error hover:border-error/50 hover:text-error"
      >
        No continuará
      </SubmitButton>
    </ConfirmForm>
  );
}
