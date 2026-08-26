"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { cn } from "@/lib/cn";
import {
  validateVitalSignsInput,
  vitalSignFieldOrder,
  vitalSignLimits,
  vitalSignRangeHint,
  type VitalSignField,
  type VitalSignsInput
} from "@/features/nursing/vital-signs";

/*
 * Formulario de signos vitales con validacion en pantalla: avisa el rango
 * valido de cada medicion antes de enviar, en vez de dejar que la server
 * action falle. La validacion final sigue estando en el schema de zod.
 */

type VitalSignsFormProps = {
  action: (formData: FormData) => Promise<void>;
  notice: string;
  submitLabel: string;
  submitVariant?: "primary" | "outline";
  /** Ids que viajan con el formulario (patientId, visitId, workItemId, id). */
  hiddenFields: Record<string, string>;
  defaults?: VitalSignsInput;
  defaultNotes?: string;
  intro?: string;
  className?: string;
};

const emptyValues: VitalSignsInput = {};

export function VitalSignsForm({
  action,
  notice,
  submitLabel,
  submitVariant = "primary",
  hiddenFields,
  defaults = emptyValues,
  defaultNotes,
  intro,
  className
}: VitalSignsFormProps) {
  const fieldId = useId();
  const [values, setValues] = useState<VitalSignsInput>(defaults);
  const [touched, setTouched] = useState<Partial<Record<VitalSignField, boolean>>>({});
  const [attempted, setAttempted] = useState(false);

  const [doneAt, formAction] = useActionState(
    async (_previous: number | null, formData: FormData) => {
      await action(formData);
      return Date.now();
    },
    null
  );

  useEffect(() => {
    if (doneAt) toast.success(notice);
  }, [doneAt, notice]);

  const errors = validateVitalSignsInput(values);
  const invalidFields = vitalSignFieldOrder.filter((field) => Boolean(errors[field]));
  const shownFields = invalidFields.filter((field) => attempted || touched[field]);

  return (
    <form
      noValidate
      action={formAction}
      onSubmit={(event) => {
        if (invalidFields.length === 0) return;
        // Corta el envio y descubre todos los avisos de una vez.
        event.preventDefault();
        setAttempted(true);
      }}
      className={cn("grid gap-3", className)}
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {intro ? <p className="text-xs text-muted">{intro}</p> : null}

      {shownFields.length > 0 ? (
        <div
          className="flex gap-2 rounded-[9px] border border-error/30 bg-error/10 px-3 py-2.5 text-[13px] text-text"
          role="alert"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-error" aria-hidden="true" />
          <div className="grid gap-1">
            <p className="font-semibold text-error">
              {shownFields.length === 1
                ? "Revisa esta medición antes de guardar"
                : `Revisa estas ${shownFields.length} mediciones antes de guardar`}
            </p>
            <ul className="grid gap-0.5">
              {shownFields.map((field) => (
                <li key={field}>
                  <span className="font-medium">{vitalSignLimits[field].label}:</span>{" "}
                  {errors[field]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {vitalSignFieldOrder.map((field) => {
          const limit = vitalSignLimits[field];
          const error = attempted || touched[field] ? errors[field] : undefined;
          const describedBy = `${fieldId}-${field}-hint`;
          return (
            <Field key={field} label={`${limit.label} (${limit.unit})`}>
              <input
                className={cn(
                  internalInputClassName,
                  error && "border-error focus:border-error focus:ring-error/10"
                )}
                name={field}
                inputMode={limit.decimals > 0 ? "decimal" : "numeric"}
                placeholder={limit.placeholder}
                value={values[field] ?? ""}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                onChange={(event) =>
                  setValues((previous) => ({ ...previous, [field]: event.target.value }))
                }
                onBlur={() => setTouched((previous) => ({ ...previous, [field]: true }))}
              />
              <p
                id={describedBy}
                className={cn("text-[11px] font-normal", error ? "text-error" : "text-muted")}
              >
                {error ?? vitalSignRangeHint(field)}
              </p>
            </Field>
          );
        })}
      </div>

      <Field label="Observaciones">
        <textarea
          className={`${internalInputClassName} min-h-20 py-3`}
          name="notes"
          defaultValue={defaultNotes ?? ""}
        />
      </Field>

      <SubmitButton variant={submitVariant} className="w-full">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
