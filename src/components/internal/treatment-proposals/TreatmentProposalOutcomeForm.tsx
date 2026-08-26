"use client";

import { useState } from "react";
import type { TreatmentProposalOutcomeStatus } from "@/generated/prisma/client";
import {
  Ban,
  CheckCircle2,
  CircleHelp,
  Clock3,
  XCircle
} from "lucide-react";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Button } from "@/components/internal/ui/Button";
import { recordTreatmentProposalOutcomeAction } from "@/features/treatment-proposals/actions";
import {
  treatmentProposalOutcomeReasonLabels,
  treatmentProposalOutcomeStatusDescriptions,
  treatmentProposalOutcomeStatusLabels,
  treatmentProposalReasonsByStatus
} from "@/features/treatment-proposals/labels";
import { cn } from "@/lib/cn";

const statusOptions = [
  { value: "accepted", icon: CheckCircle2 },
  { value: "rejected", icon: XCircle },
  { value: "needs_time", icon: Clock3 },
  { value: "not_applicable", icon: Ban },
  { value: "no_decision", icon: CircleHelp }
] as const satisfies ReadonlyArray<{
  value: TreatmentProposalOutcomeStatus;
  icon: typeof CheckCircle2;
}>;

export function TreatmentProposalOutcomeForm({
  visitId,
  followUpConsentGranted
}: {
  visitId: string;
  followUpConsentGranted: boolean;
}) {
  const [status, setStatus] =
    useState<TreatmentProposalOutcomeStatus | null>(null);
  const reasons = status ? treatmentProposalReasonsByStatus[status] : [];

  return (
    <ConfirmForm
      action={recordTreatmentProposalOutcomeAction}
      notice="Resultado de la propuesta registrado"
      confirmTitle="Confirmar tratamiento aceptado"
      confirmDescription="Se enviará una orden a Administración para registrar la venta y el cobro. SIGECO todavía no creará la venta."
      confirmLabel="Confirmar y enviar a Administración"
      confirmWhen={{ field: "status", equals: "accepted" }}
      confirmAtAllWidths
      className="grid gap-4"
    >
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="status" value={status ?? ""} />

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold text-text">
          ¿Qué respondió el paciente?
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const selected = status === option.value;
            return (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                aria-pressed={selected}
                onClick={() => setStatus(option.value)}
                className={cn(
                  "h-auto min-h-16 whitespace-normal px-3 py-2 text-left",
                  selected &&
                    "border-primary/40 bg-surface-soft text-primary-dark"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {treatmentProposalOutcomeStatusLabels[option.value]}
              </Button>
            );
          })}
        </div>
      </fieldset>

      {status ? (
        <>
          <p className="rounded-[9px] bg-surface-soft px-3 py-2 text-sm text-muted">
            {treatmentProposalOutcomeStatusDescriptions[status]}
          </p>
          <Field label="Motivo principal">
            <select
              key={status}
              className={internalInputClassName}
              name="reason"
              defaultValue={reasons[0]}
              required
            >
              {reasons.map((reason) => (
                <option key={reason} value={reason}>
                  {treatmentProposalOutcomeReasonLabels[reason]}
                </option>
              ))}
            </select>
          </Field>

          {status === "accepted" ? (
            <Field label="Instrucción para Administración">
              <textarea
                className={`${internalInputClassName} min-h-24 py-3`}
                name="administrationInstruction"
                placeholder="Ej. Registrar tratamiento de 10 sesiones y coordinar forma de pago."
                maxLength={700}
                required
              />
            </Field>
          ) : null}

          {status === "needs_time" ? (
            <div
              className={cn(
                "rounded-[9px] border px-3 py-2 text-sm",
                followUpConsentGranted
                  ? "border-primary/25 bg-surface-soft text-primary-dark"
                  : "border-warning/30 bg-warning/10 text-warning"
              )}
            >
              {followUpConsentGranted
                ? "Se creará para Recepción/Marlen una tarea para mañana. No se asignará a Comunicación."
                : "No se creará seguimiento porque no existe consentimiento vigente para contactar al paciente."}
            </div>
          ) : null}

          <Field label="Nota opcional">
            <textarea
              className={`${internalInputClassName} min-h-20 py-3`}
              name="note"
              maxLength={500}
              placeholder="Agrega solo la aclaración necesaria."
            />
          </Field>

          <SubmitButton className="w-full">
            {status === "accepted"
              ? "Confirmar y enviar a Administración"
              : "Guardar resultado"}
          </SubmitButton>
        </>
      ) : (
        <p className="text-sm text-muted">
          Selecciona una opción para registrar la decisión.
        </p>
      )}
    </ConfirmForm>
  );
}
