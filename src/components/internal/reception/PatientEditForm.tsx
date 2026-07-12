"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Field, internalInputClassName } from "@/components/internal/Field";
import {
  patientCaptureSourceLabels,
  patientGenderLabels
} from "@/features/patients/labels";
import { followUpContactPreferenceLabels } from "@/features/reception/labels";
import { updateReceptionPatientAction } from "@/features/reception/actions";
import {
  calculateAge,
  ChipOption,
  cityChips,
  cityStateFrom,
  NO_KNOWN_ALLERGIES,
  type CityChoice
} from "@/components/internal/reception/funnel-fields";
import { cn } from "@/lib/cn";

export type EditablePatient = {
  id: string;
  internalCode: string;
  fullName: string;
  phone: string;
  birthDate: string;
  gender: string;
  city: string | null;
  captureSources: string[];
  allergies: string | null;
  relevantHistory: string | null;
  currentMedication: string | null;
  followUpPreference: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}

export function PatientEditForm({ patient }: { patient: EditablePatient }) {
  const [formError, setFormError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(patient.fullName);
  const [phone, setPhone] = useState(patient.phone);
  const [birthDate, setBirthDate] = useState(patient.birthDate);
  const [gender, setGender] = useState(patient.gender);
  const initialCity = cityStateFrom(patient.city);
  const [cityChoice, setCityChoice] = useState<CityChoice>(initialCity.choice);
  const [cityOther, setCityOther] = useState(initialCity.other);

  const initialNoAllergies = patient.allergies === NO_KNOWN_ALLERGIES;
  const [noKnownAllergies, setNoKnownAllergies] = useState(initialNoAllergies);
  const [allergies, setAllergies] = useState(initialNoAllergies ? "" : (patient.allergies ?? ""));
  const [relevantHistory, setRelevantHistory] = useState(patient.relevantHistory ?? "");
  const [currentMedication, setCurrentMedication] = useState(patient.currentMedication ?? "");

  const [captureSources, setCaptureSources] = useState<string[]>(patient.captureSources);
  const [followUpPreference, setFollowUpPreference] = useState(
    patient.followUpPreference === "unknown" ? "" : patient.followUpPreference
  );

  const age = calculateAge(birthDate);
  const city = cityChoice === "otra" ? cityOther : cityChoice;
  const resolvedAllergies = noKnownAllergies ? NO_KNOWN_ALLERGIES : allergies;

  function toggleCaptureSource(value: string) {
    setCaptureSources((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

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
    setFormError(null);
  }

  return (
    <form
      action={updateReceptionPatientAction}
      onSubmit={validateBeforeSubmit}
      className="grid gap-4"
    >
      <input type="hidden" name="patientId" value={patient.id} />
      <input type="hidden" name="fullName" value={fullName} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="birthDate" value={birthDate} />
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="allergies" value={resolvedAllergies} />
      <input type="hidden" name="relevantHistory" value={relevantHistory} />
      <input type="hidden" name="currentMedication" value={currentMedication} />
      <input type="hidden" name="captureSources" value={captureSources.join(",")} />
      <input type="hidden" name="followUpPreference" value={followUpPreference || "unknown"} />

      <Card className="grid gap-4">
        <CardHeader title="Identificación" className="mb-0" />
        <Field label="Nombre completo *">
          <input
            className={internalInputClassName}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="Teléfono (WhatsApp) *">
          <input
            className={internalInputClassName}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label={age !== null ? `Fecha de nacimiento (${age} años)` : "Fecha de nacimiento"}>
          <input
            className={internalInputClassName}
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </Field>
        <div className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>Ciudad</span>
          <div className="flex flex-wrap gap-2">
            {cityChips.map((option) => (
              <ChipOption
                key={option}
                selected={cityChoice === option}
                onClick={() => setCityChoice(cityChoice === option ? "" : option)}
              >
                {option}
              </ChipOption>
            ))}
            <ChipOption
              selected={cityChoice === "otra"}
              onClick={() => setCityChoice(cityChoice === "otra" ? "" : "otra")}
            >
              Otra
            </ChipOption>
          </div>
          {cityChoice === "otra" ? (
            <input
              className={internalInputClassName}
              value={cityOther}
              onChange={(event) => setCityOther(event.target.value)}
              placeholder="¿Cuál?"
            />
          ) : null}
        </div>
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
      </Card>

      <Card className="grid gap-4">
        <CardHeader title="Origen y seguimiento" className="mb-0" />
        <div className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>¿Cómo nos conoció? (puede elegir varios)</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(patientCaptureSourceLabels).map(([value, label]) => (
              <ChipOption
                key={value}
                selected={captureSources.includes(value)}
                onClick={() => toggleCaptureSource(value)}
              >
                {label}
              </ChipOption>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>¿Podemos contactarlo para seguimiento?</span>
          <div className="flex flex-wrap gap-2">
            {(["whatsapp", "call", "both", "no_contact"] as const).map((value) => (
              <ChipOption
                key={value}
                selected={followUpPreference === value}
                onClick={() => setFollowUpPreference(followUpPreference === value ? "" : value)}
              >
                {followUpContactPreferenceLabels[value]}
              </ChipOption>
            ))}
          </div>
        </div>
      </Card>

      {formError ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-error" role="alert">
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {formError}
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Link
          href={`/sigeco/recepcion/pacientes/${patient.id}`}
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Cancelar
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
