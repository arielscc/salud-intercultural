import type { VisitPendingType } from "@/generated/prisma/client";
import { ChipRadio } from "@/components/internal/ui/ChipRadio";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Checkbox } from "@/components/ui/checkbox";
import { visitDiscontinuationReasonOptions } from "@/features/visit-discontinuations/labels";
import { recordVisitDiscontinuationAction } from "@/features/visit-discontinuations/actions";
import { cn } from "@/lib/cn";

export function VisitDiscontinuationForm({
  visitId,
  patientName,
  defaultPendingTypes = [],
  compact = false,
  showRecoveryFollowUp = true,
  showNote = true,
  submitLabel = "No continuará"
}: {
  visitId: string;
  patientName: string;
  /**
   * Pendientes conocidos por la pantalla que abre el formulario. Ya no se editan
   * a mano (SIGECO los detecta solos); viajan como hidden y el server los fusiona
   * con los que detecta de la visita.
   */
  defaultPendingTypes?: VisitPendingType[];
  compact?: boolean;
  /** Versión mínima (ej. salida del médico): solo motivo + botón de cierre. */
  showRecoveryFollowUp?: boolean;
  showNote?: boolean;
  submitLabel?: string;
}) {
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
      {defaultPendingTypes.map((type) => (
        <input key={type} type="hidden" name="pendingTypes" value={type} />
      ))}

      {/* Motivo en chips (un toque). SIGECO detecta solo los pendientes de la visita. */}
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-text">
          ¿Por qué no continúa?
        </legend>
        <div className="flex flex-wrap gap-2">
          {visitDiscontinuationReasonOptions.map(([value, label]) => (
            <ChipRadio key={value} name="reason" value={value} label={label} required />
          ))}
        </div>
      </fieldset>

      {showRecoveryFollowUp ? (
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
      ) : null}

      {showNote ? (
        <Field label="Nota opcional">
          <textarea
            className={`${internalInputClassName} min-h-20 py-3`}
            name="note"
            maxLength={500}
            placeholder="Ej. esperó 40 minutos y volverá mañana"
          />
        </Field>
      ) : null}

      <SubmitButton
        variant="outline"
        className="w-full border-error/30 text-error hover:border-error/50 hover:text-error"
      >
        {submitLabel}
      </SubmitButton>
    </ConfirmForm>
  );
}
