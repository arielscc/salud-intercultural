"use client";

import { useState } from "react";
import type {
  FollowUpAttemptMethod,
  FollowUpResult,
  FollowUpType
} from "@/generated/prisma/client";
import { AlertTriangle, CheckCircle2, PhoneForwarded } from "lucide-react";
import { DateTimePickerField } from "@/components/internal/ui/DatePickerField";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Button } from "@/components/internal/ui/Button";
import { createFollowUpAttemptAction } from "@/features/follow-ups/actions";
import {
  followUpAttemptMethodLabels,
  followUpResultLabels
} from "@/features/follow-ups/labels";
import {
  followUpResultCreatesDoctorCall,
  followUpResultKeepsTaskOpen,
  followUpResultsByType
} from "@/features/follow-ups/policy";
import { cn } from "@/lib/cn";

export function FollowUpAttemptForm({
  taskId,
  type,
  availableMethods,
  defaultNextDueAt
}: {
  taskId: string;
  type: FollowUpType;
  availableMethods: FollowUpAttemptMethod[];
  defaultNextDueAt: Date;
}) {
  const results = followUpResultsByType[type];
  const [result, setResult] = useState<FollowUpResult>(results[0]);
  const keepsOpen = followUpResultKeepsTaskOpen(result);
  const createsDoctorCall =
    type !== "doctor_call" && followUpResultCreatesDoctorCall(result);

  return (
    <NoticeForm
      action={createFollowUpAttemptAction}
      notice="Contacto registrado"
      className="grid gap-4"
    >
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="result" value={result} />

      <Field label="Método">
        <select
          className={internalInputClassName}
          name="method"
          defaultValue={availableMethods[0] ?? "in_person"}
        >
          {availableMethods.map((method) => (
            <option key={method} value={method}>
              {followUpAttemptMethodLabels[method]}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-text">
          Resultado
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {results.map((option) => (
            <Button
              key={option}
              type="button"
              variant="outline"
              aria-pressed={result === option}
              onClick={() => setResult(option)}
              className={cn(
                "h-auto min-h-12 whitespace-normal px-3 py-2 text-left",
                result === option &&
                  "border-primary/40 bg-surface-soft text-primary-dark"
              )}
            >
              {option === "worsened" ? (
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : option === "escalated_to_doctor" ? (
                <PhoneForwarded className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              {followUpResultLabels[option]}
            </Button>
          ))}
        </div>
      </fieldset>

      {keepsOpen ? (
        <Field label="Volver a intentar">
          <DateTimePickerField
            name="nextDueAt"
            defaultDate={defaultNextDueAt}
            required
          />
        </Field>
      ) : null}

      {createsDoctorCall ? (
        <p className="rounded-[9px] border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          SIGECO cerrará esta gestión y creará una llamada urgente para el
          médico. No se cerrará como tarea administrativa.
        </p>
      ) : null}

      <Field label="Notas">
        <textarea
          className={`${internalInputClassName} min-h-24 py-3`}
          name="notes"
          maxLength={700}
          placeholder="Registra solo la respuesta y el próximo paso."
        />
      </Field>
      <SubmitButton className="w-full">Guardar resultado</SubmitButton>
    </NoticeForm>
  );
}
