"use client";

import { useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { PhoneInput } from "@/components/internal/reception/PhoneInput";
import { GeographicOriginFields } from "@/components/internal/reception/GeographicOriginFields";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { DatePickerField } from "@/components/internal/ui/DatePickerField";
import { FormActions } from "@/components/internal/ui/FormActions";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { patientGenderLabels } from "@/features/patients/labels";
import { updateReceptionPatientAction } from "@/features/reception/actions";
import {
  calculateAge,
  ChipOption,
  NO_KNOWN_ALLERGIES
} from "@/components/internal/reception/funnel-fields";
import {
  BOLIVIA_COUNTRY,
  isCompleteGeographicOrigin,
  type GeographicOriginValue
} from "@/features/geography/origin";
import { cn } from "@/lib/cn";

export type EditablePatient = {
  id: string;
  internalCode: string;
  fullName: string;
  phone: string;
  birthDate: string;
  gender: string;
  city: string | null;
  department: string | null;
  country: string | null;
  allergies: string | null;
  relevantHistory: string | null;
  currentMedication: string | null;
};

export function PatientEditForm({
  patient,
  allowDuplicate = false
}: {
  patient: EditablePatient;
  allowDuplicate?: boolean;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(patient.fullName);
  const [phone, setPhone] = useState(patient.phone);
  const [birthDate, setBirthDate] = useState(patient.birthDate);
  const [gender, setGender] = useState(patient.gender);
  const [patientOrigin, setPatientOrigin] = useState<GeographicOriginValue>({
    city: patient.city ?? "",
    department: patient.department ?? "",
    country: patient.country ?? BOLIVIA_COUNTRY
  });

  const initialNoAllergies = patient.allergies === NO_KNOWN_ALLERGIES;
  const [noKnownAllergies, setNoKnownAllergies] = useState(initialNoAllergies);
  const [allergies, setAllergies] = useState(initialNoAllergies ? "" : (patient.allergies ?? ""));
  const [relevantHistory, setRelevantHistory] = useState(patient.relevantHistory ?? "");
  const [currentMedication, setCurrentMedication] = useState(patient.currentMedication ?? "");

  const age = calculateAge(birthDate);
  const resolvedAllergies = noKnownAllergies ? NO_KNOWN_ALLERGIES : allergies;
  const nameError = formError === "Ingresa el nombre completo.";
  const phoneError = formError === "Ingresa un teléfono válido.";

  function validateBeforeSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (fullName.trim().length < 2) {
      setFormError("Ingresa el nombre completo.");
      event.preventDefault();
      return;
    }
    if (!/^[+()\d\s-]{6,}$/.test(phone.trim())) {
      setFormError("Ingresa un teléfono válido.");
      event.preventDefault();
      return;
    }
    if (!isCompleteGeographicOrigin(patientOrigin)) {
      setFormError(
        "Completa la ciudad, el departamento y el país de procedencia habitual."
      );
      event.preventDefault();
      return;
    }
    setFormError(null);
  }

  return (
    <form
      action={updateReceptionPatientAction}
      onSubmit={validateBeforeSubmit}
      className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start"
    >
      <input type="hidden" name="patientId" value={patient.id} />
      {allowDuplicate ? (
        <input type="hidden" name="allowDuplicate" value="true" />
      ) : null}
      <input type="hidden" name="fullName" value={fullName} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="birthDate" value={birthDate} />
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="city" value={patientOrigin.city} />
      <input
        type="hidden"
        name="department"
        value={patientOrigin.department}
      />
      <input type="hidden" name="country" value={patientOrigin.country} />
      <input type="hidden" name="allergies" value={resolvedAllergies} />
      <input type="hidden" name="relevantHistory" value={relevantHistory} />
      <input type="hidden" name="currentMedication" value={currentMedication} />

      {formError ? (
        <p
          className="hidden items-center gap-1.5 rounded-[9px] bg-error/10 px-4 py-3 text-sm font-semibold text-error lg:col-span-2 lg:flex"
          role="alert"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {formError}
        </p>
      ) : null}

      <Card className="grid gap-4 lg:row-span-2">
        <CardHeader title="Identificación" className="mb-0" />
        <Field label="Nombre completo *">
          <input
            className={internalInputClassName}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="off"
            aria-invalid={nameError}
            aria-describedby={nameError ? "patient-name-error" : undefined}
          />
          {nameError ? (
            <span id="patient-name-error" className="text-xs font-semibold text-error">
              {formError}
            </span>
          ) : null}
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Teléfono (WhatsApp) *">
            <PhoneInput value={phone} onValueChange={setPhone} />
            {phoneError ? (
              <span className="text-xs font-semibold text-error">{formError}</span>
            ) : null}
          </Field>
          <Field
            label={age !== null ? `Fecha de nacimiento (${age} años)` : "Fecha de nacimiento"}
          >
            <DatePickerField value={birthDate} onChange={setBirthDate} />
          </Field>
        </div>
        <GeographicOriginFields
          idPrefix="patient-edit-origin"
          label="Procedencia habitual"
          description="Lugar donde vive normalmente el paciente."
          value={patientOrigin}
          onChange={setPatientOrigin}
          required
        />
        <div className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>Género (opcional)</span>
          <div className="flex flex-wrap gap-2">
            {(["female", "male", "other"] as const).map((option) => (
              <ChipOption
                key={option}
                selected={gender === option}
                onClick={() => setGender(gender === option ? "unknown" : option)}
              >
                {patientGenderLabels[option]}
              </ChipOption>
            ))}
          </div>
        </div>
      </Card>

      <Card className="grid gap-4">
        <CardHeader title="Antecedentes" className="mb-0" />
        <div className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>Alergias</span>
          <div className="flex flex-wrap gap-2">
            <ChipOption
              selected={noKnownAllergies}
              onClick={() => setNoKnownAllergies(!noKnownAllergies)}
            >
              {NO_KNOWN_ALLERGIES}
            </ChipOption>
          </div>
          {noKnownAllergies ? null : (
            <input
              className={internalInputClassName}
              value={allergies}
              onChange={(event) => setAllergies(event.target.value)}
              placeholder="Ej. penicilina (vacío si no sabe)"
            />
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Enfermedad de base (opcional)">
            <input
              className={internalInputClassName}
              value={relevantHistory}
              onChange={(event) => setRelevantHistory(event.target.value)}
              placeholder="Ej. diabetes, hipertensión"
            />
          </Field>
          <Field label="Medicación actual (opcional)">
            <input
              className={internalInputClassName}
              value={currentMedication}
              onChange={(event) => setCurrentMedication(event.target.value)}
              placeholder="Ej. metformina cada mañana"
            />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-3">
        <CardHeader title="Datos históricos" className="mb-0" />
        <p className="text-sm leading-relaxed text-muted">
          La fuente original no se modifica desde esta pantalla. Cada nueva
          llegada registra sus propias fuentes para que el historial y los
          reportes no cambien después.
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Los consentimientos no se cambian al editar la ficha. Se registran por
          separado para conservar la decisión y el texto exacto aceptado.
        </p>
      </Card>

      {formError ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-error lg:hidden" role="alert">
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {formError}
        </p>
      ) : null}

      <FormActions className="lg:col-span-2">
        <Link
          href={`/sigeco/recepcion/pacientes/${patient.id}`}
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Cancelar
        </Link>
        <SubmitButton pendingLabel="Guardando...">Guardar cambios</SubmitButton>
      </FormActions>
    </form>
  );
}
