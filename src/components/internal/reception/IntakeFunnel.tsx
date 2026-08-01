"use client";

import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import {
  PatientAutocomplete,
  type PatientSearchResult
} from "@/components/internal/reception/PatientAutocomplete";
import { PhoneInput } from "@/components/internal/reception/PhoneInput";
import { GeographicOriginFields } from "@/components/internal/reception/GeographicOriginFields";
import {
  calculateAge,
  ChipOption,
  NO_KNOWN_ALLERGIES,
  normalizePhone
} from "@/components/internal/reception/funnel-fields";
import { Button } from "@/components/internal/ui/Button";
import { Card } from "@/components/internal/ui/Card";
import { DatePickerField } from "@/components/internal/ui/DatePickerField";
import { FormActions } from "@/components/internal/ui/FormActions";
import {
  patientGenderLabels
} from "@/features/patients/labels";
import type { CaptureSourceOption } from "@/modules/database/queries/attribution";
import {
  searchReceptionPatientsAction,
  submitReceptionIntakeAction
} from "@/features/reception/actions";
import {
  symptomDurationUnitLabels,
  visitIntakeTypeLabels
} from "@/features/reception/labels";
import {
  BOLIVIA_COUNTRY,
  isCompleteGeographicOrigin,
  type GeographicOriginValue
} from "@/features/geography/origin";
import { cn } from "@/lib/cn";
import { Search, UserRoundPlus } from "lucide-react";
import { useState, useTransition } from "react";

type PatientMatch = PatientSearchResult;

const stepTitles: Record<number, string> = {
  1: "Datos y procedencia habitual",
  2: "¿A qué viene?",
  3: "Antecedentes rápidos",
  4: "Procedencia de la visita y captación"
};

export function IntakeFunnel({
  idempotencyKey,
  allowDuplicateFromServer = false,
  initialPatient,
  captureSourceOptions
}: {
  idempotencyKey: string;
  allowDuplicateFromServer?: boolean;
  initialPatient?: PatientMatch;
  captureSourceOptions: CaptureSourceOption[];
}) {
  const [step, setStep] = useState(initialPatient ? 1 : 0);
  const [stepError, setStepError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PatientMatch[] | null>(null);
  const [isSearching, startSearch] = useTransition();

  const [existingPatient, setExistingPatient] = useState<PatientMatch | null>(
    initialPatient ?? null
  );
  const [phoneMatches, setPhoneMatches] = useState<PatientMatch[]>([]);
  const [allowDuplicate, setAllowDuplicate] = useState(allowDuplicateFromServer);

  const [fullName, setFullName] = useState(initialPatient?.fullName ?? "");
  const [phone, setPhone] = useState(initialPatient?.phone ?? "");
  const [birthDate, setBirthDate] = useState(initialPatient?.birthDate ?? "");
  const [gender, setGender] = useState(initialPatient?.gender ?? "unknown");
  const [patientOrigin, setPatientOrigin] = useState<GeographicOriginValue>({
    city: initialPatient?.city ?? "",
    department: initialPatient?.department ?? "",
    country: initialPatient?.country ?? BOLIVIA_COUNTRY
  });
  const [visitOriginMode, setVisitOriginMode] = useState<"same" | "different">(
    "same"
  );
  const [visitOrigin, setVisitOrigin] = useState<GeographicOriginValue>({
    city: "",
    department: "",
    country: BOLIVIA_COUNTRY
  });

  const [reason, setReason] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("");
  const [intakeType, setIntakeType] = useState("first_visit");
  const [previouslyTreated, setPreviouslyTreated] = useState("");
  const [bringsStudies, setBringsStudies] = useState("");

  const initialNoAllergies = initialPatient?.allergies === NO_KNOWN_ALLERGIES;
  const [noKnownAllergies, setNoKnownAllergies] = useState(initialNoAllergies);
  const [allergies, setAllergies] = useState(
    initialNoAllergies ? "" : (initialPatient?.allergies ?? "")
  );
  const [relevantHistory, setRelevantHistory] = useState(initialPatient?.relevantHistory ?? "");
  const [currentMedication, setCurrentMedication] = useState(
    initialPatient?.currentMedication ?? ""
  );

  const [capturePrimarySource, setCapturePrimarySource] = useState("");
  const [captureSupportSources, setCaptureSupportSources] = useState<string[]>([]);
  const [attributionEvidenceCode, setAttributionEvidenceCode] = useState("");

  const age = calculateAge(birthDate);
  const resolvedAllergies = noKnownAllergies ? NO_KNOWN_ALLERGIES : allergies;

  function toggleCaptureSupportSource(value: string) {
    setCaptureSupportSources((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function choosePrimaryCaptureSource(value: string) {
    setCapturePrimarySource(value);
    setCaptureSupportSources((current) =>
      current.filter((source) => source !== value)
    );
  }

  function prefillFromPatient(patient: PatientMatch) {
    setExistingPatient(patient);
    setFullName(patient.fullName);
    setPhone(patient.phone);
    setBirthDate(patient.birthDate);
    setGender(patient.gender);
    setPatientOrigin({
      city: patient.city ?? "",
      department: patient.department ?? "",
      country: patient.country ?? BOLIVIA_COUNTRY
    });
    setVisitOriginMode("same");
    setVisitOrigin({ city: "", department: "", country: BOLIVIA_COUNTRY });
    setNoKnownAllergies(patient.allergies === NO_KNOWN_ALLERGIES);
    setAllergies(patient.allergies === NO_KNOWN_ALLERGIES ? "" : (patient.allergies ?? ""));
    setRelevantHistory(patient.relevantHistory ?? "");
    setCurrentMedication(patient.currentMedication ?? "");
    setCapturePrimarySource("");
    setCaptureSupportSources([]);
    setAttributionEvidenceCode("");
    setPhoneMatches([]);
    setStepError(null);
    setStep(1);
  }

  /*
   * Arranca el funnel limpio. Lo unico que se conserva es el termino buscado:
   * si parece telefono siembra el campo telefono, si no, el nombre.
   */
  function startAsNewPatient() {
    const term = searchTerm.trim();
    const looksLikePhone = term !== "" && /^[+()\d\s-]+$/.test(term);

    setExistingPatient(null);
    setFullName(looksLikePhone ? "" : term);
    setPhone(looksLikePhone ? term : "");
    setBirthDate("");
    setGender("unknown");
    setPatientOrigin({
      city: "",
      department: "",
      country: BOLIVIA_COUNTRY
    });
    setVisitOriginMode("same");
    setVisitOrigin({ city: "", department: "", country: BOLIVIA_COUNTRY });
    setNoKnownAllergies(false);
    setAllergies("");
    setRelevantHistory("");
    setCurrentMedication("");
    setCapturePrimarySource("");
    setCaptureSupportSources([]);
    setAttributionEvidenceCode("");
    setPhoneMatches([]);
    setStepError(null);
    setStep(1);
  }

  function runSearch() {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    startSearch(async () => {
      const results = await searchReceptionPatientsAction(term);
      setSearchResults(results);
    });
  }

  function continueFromStep1() {
    if (fullName.trim().length < 2) {
      setStepError("Ingresa el nombre completo.");
      return;
    }
    if (!/^[+()\d\s-]{6,}$/.test(phone.trim())) {
      setStepError("Ingresa un teléfono válido.");
      return;
    }
    if (!isCompleteGeographicOrigin(patientOrigin)) {
      setStepError(
        "Completa la ciudad, el departamento y el país de procedencia habitual."
      );
      return;
    }
    setStepError(null);

    if (existingPatient || allowDuplicate) {
      setStep(2);
      return;
    }

    const phoneDigits = normalizePhone(phone);
    startSearch(async () => {
      const results = await searchReceptionPatientsAction(phoneDigits.slice(-8));
      const matches = results.filter((patient) =>
        normalizePhone(patient.phone).endsWith(phoneDigits.slice(-8))
      );
      if (matches.length > 0) {
        setPhoneMatches(matches);
      } else {
        setPhoneMatches([]);
        setStep(2);
      }
    });
  }

  function continueFromStep2() {
    if (reason.trim().length < 2) {
      setStepError("Ingresa el motivo de la visita.");
      return;
    }
    if ((durationValue !== "") !== (durationUnit !== "")) {
      setStepError("Para “desde cuándo” completa la cantidad y la unidad, o deja ambas vacías.");
      return;
    }
    setStepError(null);
    setStep(3);
  }

  function goBack() {
    setStepError(null);
    setPhoneMatches([]);
    setStep((current) => Math.max(0, current - 1));
  }

  return (
    <form
      action={submitReceptionIntakeAction}
      className="grid gap-4"
      onSubmit={(event) => {
        if (step !== 4) {
          event.preventDefault();
          return;
        }
        if (
          visitOriginMode === "different" &&
          !isCompleteGeographicOrigin(visitOrigin)
        ) {
          event.preventDefault();
          setStepError("Completa la procedencia desde la que llega hoy.");
          return;
        }
        if (!capturePrimarySource) {
          event.preventDefault();
          setStepError("Selecciona dónde conoció la clínica por primera vez.");
        }
      }}
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="funnelCompleted" value={step === 4 ? "true" : "false"} />
      <input type="hidden" name="patientId" value={existingPatient?.id ?? ""} />
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
      <input type="hidden" name="visitOriginMode" value={visitOriginMode} />
      <input type="hidden" name="visitOriginCity" value={visitOrigin.city} />
      <input
        type="hidden"
        name="visitOriginDepartment"
        value={visitOrigin.department}
      />
      <input
        type="hidden"
        name="visitOriginCountry"
        value={visitOrigin.country}
      />
      <input type="hidden" name="reason" value={reason} />
      <input type="hidden" name="symptomDurationValue" value={durationValue} />
      <input type="hidden" name="symptomDurationUnit" value={durationUnit} />
      <input type="hidden" name="intakeType" value={intakeType} />
      <input type="hidden" name="previouslyTreated" value={previouslyTreated} />
      <input type="hidden" name="bringsStudies" value={bringsStudies} />
      <input type="hidden" name="allergies" value={resolvedAllergies} />
      <input type="hidden" name="relevantHistory" value={relevantHistory} />
      <input type="hidden" name="currentMedication" value={currentMedication} />
      <input
        type="hidden"
        name="capturePrimarySource"
        value={capturePrimarySource}
      />
      <input
        type="hidden"
        name="captureSupportSources"
        value={captureSupportSources.join(",")}
      />
      <input
        type="hidden"
        name="attributionEvidenceCode"
        value={attributionEvidenceCode}
      />
      {allowDuplicate ? <input type="hidden" name="allowDuplicate" value="true" /> : null}

      {step > 0 ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-[13px] font-medium text-muted">
            <span className="font-semibold text-text">{stepTitles[step]}</span>
            <span>Paso {step} de 4</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((marker) => (
              <span
                key={marker}
                className={cn(
                  "h-1 rounded-full",
                  marker <= step ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>
      ) : null}

      {existingPatient && step > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[9px] bg-surface-soft px-4 py-2.5 text-sm">
          <p className="text-text">
            Ficha existente <span className="font-semibold">{existingPatient.internalCode}</span> — se
            actualizará con lo que corrijas.
          </p>
          <Button type="button" variant="link" size="sm" onClick={() => setExistingPatient(null)}>
            Registrar como nuevo
          </Button>
        </div>
      ) : null}

      {step === 0 ? (
        <Card className="grid gap-4">
          <div>
            <h2 className="font-sora text-lg font-semibold text-text">¿Ya nos visitó antes?</h2>
            <p className="mt-1 text-sm text-muted">
              Busca por nombre, teléfono o código antes de registrar para no duplicar fichas.
            </p>
          </div>
          <div className="sm:hidden">
            <PatientAutocomplete
              mode="select"
              value={searchTerm}
              onValueChange={setSearchTerm}
              onSelect={prefillFromPatient}
              onCreateNew={startAsNewPatient}
            />
          </div>

          <div className="hidden sm:grid sm:gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className={internalInputClassName}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Nombre, teléfono o código"
                autoFocus
              />
              <Button type="button" variant="outline" onClick={runSearch} disabled={isSearching}>
                <Search className="h-4 w-4" aria-hidden="true" />
                {isSearching ? "Buscando…" : "Buscar"}
              </Button>
            </div>

            {searchResults !== null ? (
              <div className="grid gap-2">
                {searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => prefillFromPatient(patient)}
                    className="focus-ring grid gap-0.5 rounded-[9px] border border-border bg-surface px-4 py-3 text-left transition hover:border-primary/40"
                  >
                    <span className="font-semibold text-text">{patient.fullName}</span>
                    <span className="text-[13px] text-muted">
                      {patient.internalCode} · {patient.phone}
                      {patient.city ? ` · ${patient.city}` : ""}
                    </span>
                  </button>
                ))}
                {searchResults.length === 0 ? (
                  <p className="rounded-[9px] bg-background px-4 py-3 text-sm text-muted">
                    Sin resultados. Continúa con los datos de la persona nueva.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="border-t border-border pt-4">
              <Button type="button" onClick={startAsNewPatient}>
                <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
                Es una persona nueva
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className={cn("grid gap-4 lg:grid-cols-2", step === 1 ? "" : "hidden")}>
        <Field label="Nombre completo *">
          <input
            className={internalInputClassName}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="Teléfono (WhatsApp) *">
          <PhoneInput value={phone} onValueChange={setPhone} />
        </Field>
        <Field label={age !== null ? `Fecha de nacimiento (${age} años)` : "Fecha de nacimiento"}>
          <DatePickerField value={birthDate} onChange={setBirthDate} />
        </Field>
        <GeographicOriginFields
          idPrefix="patient-origin"
          label="Procedencia habitual"
          description="Lugar donde vive normalmente. No necesariamente es el lugar desde el que llegó hoy."
          value={patientOrigin}
          onChange={setPatientOrigin}
          required
          className="lg:col-span-2"
        />
        <div className="grid gap-1.5 text-[13px] font-medium text-text lg:col-span-2">
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

        {phoneMatches.length > 0 ? (
          <div className="grid gap-2 rounded-[9px] bg-warning/10 px-4 py-3 text-sm lg:col-span-2">
            <p className="flex items-center gap-1.5 font-semibold text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              Ya existe una ficha con este teléfono
            </p>
            {phoneMatches.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => prefillFromPatient(patient)}
                className="focus-ring grid gap-0.5 rounded-[9px] border border-border bg-surface px-4 py-2.5 text-left transition hover:border-primary/40"
              >
                <span className="font-semibold text-text">{patient.fullName}</span>
                <span className="text-[13px] text-muted">
                  {patient.internalCode} · {patient.phone}
                </span>
              </button>
            ))}
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setAllowDuplicate(true);
                setPhoneMatches([]);
                setStep(2);
              }}
            >
              No es la misma persona, continuar como persona nueva
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className={cn("grid gap-4 lg:grid-cols-2", step === 2 ? "" : "hidden")}>
        <Field label="¿Qué le trae hoy? *" className="lg:col-span-2">
          <input
            className={internalInputClassName}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo en palabras de la persona"
          />
        </Field>
        <div className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>¿Desde cuándo?</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={cn(internalInputClassName, "w-24")}
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              value={durationValue}
              onChange={(event) => setDurationValue(event.target.value)}
              aria-label="Cantidad"
            />
            {Object.entries(symptomDurationUnitLabels).map(([value, label]) => (
              <ChipOption
                key={value}
                selected={durationUnit === value}
                onClick={() => setDurationUnit(durationUnit === value ? "" : value)}
              >
                {label}
              </ChipOption>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>¿Primera consulta o control?</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(visitIntakeTypeLabels).map(([value, label]) => (
              <ChipOption
                key={value}
                selected={intakeType === value}
                onClick={() => setIntakeType(value)}
              >
                {label}
              </ChipOption>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>¿Ya se atendió antes por esto?(En otro lugar)</span>
          <div className="flex flex-wrap gap-2">
            <ChipOption
              selected={previouslyTreated === "yes"}
              onClick={() => setPreviouslyTreated(previouslyTreated === "yes" ? "" : "yes")}
            >
              Sí
            </ChipOption>
            <ChipOption
              selected={previouslyTreated === "no"}
              onClick={() => setPreviouslyTreated(previouslyTreated === "no" ? "" : "no")}
            >
              No
            </ChipOption>
          </div>
        </div>
        <div className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>¿Trae análisis o estudios?</span>
          <div className="flex flex-wrap gap-2">
            <ChipOption
              selected={bringsStudies === "yes"}
              onClick={() => setBringsStudies(bringsStudies === "yes" ? "" : "yes")}
            >
              Sí
            </ChipOption>
            <ChipOption
              selected={bringsStudies === "no"}
              onClick={() => setBringsStudies(bringsStudies === "no" ? "" : "no")}
            >
              No
            </ChipOption>
          </div>
        </div>
      </Card>

      <Card className={cn("grid gap-4 lg:grid-cols-2", step === 3 ? "" : "hidden")}>
        <div className="grid gap-1.5 text-[13px] font-medium text-text lg:col-span-2">
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

      <Card className={cn("grid gap-4 lg:grid-cols-2", step === 4 ? "" : "hidden")}>
        <div className="grid gap-2 lg:col-span-2">
          <p className="text-[13px] font-semibold text-text">
            ¿Hoy llega desde su procedencia habitual?
          </p>
          <div className="flex flex-wrap gap-2">
            <ChipOption
              selected={visitOriginMode === "same"}
              onClick={() => setVisitOriginMode("same")}
            >
              Sí, desde el mismo lugar
            </ChipOption>
            <ChipOption
              selected={visitOriginMode === "different"}
              onClick={() => setVisitOriginMode("different")}
            >
              No, llega desde otro lugar
            </ChipOption>
          </div>
        </div>
        {visitOriginMode === "different" ? (
          <GeographicOriginFields
            idPrefix="visit-origin"
            label="Procedencia de esta visita"
            description="Este dato queda guardado en la visita aunque después cambie la ficha del paciente."
            value={visitOrigin}
            onChange={setVisitOrigin}
            required
            className="lg:col-span-2"
          />
        ) : (
          <p className="rounded-[9px] bg-background px-4 py-3 text-sm text-muted lg:col-span-2">
            Esta visita conservará:{" "}
            <span className="font-semibold text-text">
              {[patientOrigin.city, patientOrigin.department, patientOrigin.country]
                .filter(Boolean)
                .join(" · ")}
            </span>
            .
          </p>
        )}
        <div className="grid gap-2 text-[13px] font-medium text-text lg:col-span-2">
          <span>¿Dónde conoció la clínica por primera vez? *</span>
          <p className="text-xs font-normal leading-relaxed text-muted">
            Haz esta pregunta con palabras simples. Por ejemplo: “¿Fue por
            Facebook, TikTok, una recomendación u otro medio?”.
          </p>
          <div className="flex flex-wrap gap-2">
            {captureSourceOptions.map((source) => (
              <ChipOption
                key={source.id}
                selected={capturePrimarySource === source.code}
                onClick={() => choosePrimaryCaptureSource(source.code)}
              >
                {source.patientLabel}
              </ChipOption>
            ))}
          </div>
        </div>
        {capturePrimarySource ? (
          <div className="grid gap-2 text-[13px] font-medium text-text lg:col-span-2">
            <span>¿Qué otro canal le ayudó a llegar? (opcional)</span>
            <p className="text-xs font-normal leading-relaxed text-muted">
              Ejemplo: conoció la clínica por TikTok y después escribió por
              WhatsApp. WhatsApp queda como apoyo y no borra TikTok.
            </p>
            <div className="flex flex-wrap gap-2">
              {captureSourceOptions
                .filter((source) => source.code !== capturePrimarySource)
                .map((source) => (
                  <ChipOption
                    key={source.id}
                    selected={captureSupportSources.includes(source.code)}
                    onClick={() => toggleCaptureSupportSource(source.code)}
                  >
                    {source.patientLabel}
                  </ChipOption>
                ))}
            </div>
          </div>
        ) : null}
        <Field
          label="Código de formulario o campaña (opcional)"
          className="lg:col-span-2"
        >
          <input
            className={internalInputClassName}
            value={attributionEvidenceCode}
            onChange={(event) =>
              setAttributionEvidenceCode(event.target.value.toUpperCase())
            }
            placeholder="Ej. WEB-123 o TIKTOK-DR"
            autoComplete="off"
            maxLength={120}
          />
          <span className="text-xs font-normal leading-relaxed text-muted">
            Úsalo solo si aparece en el formulario, enlace o registro de
            campaña. El sistema obtendrá la cuenta y si fue orgánico o pagado;
            Recepción no debe adivinarlo.
          </span>
        </Field>
        <div className="rounded-[9px] bg-background px-4 py-3 text-sm text-muted lg:col-span-2">
          Solo al confirmar este último paso la persona se convierte en paciente: se crea su ficha y
          la visita queda abierta en recepción. Los consentimientos se registran después, desde la
          ficha del paciente, leyendo cada autorización por separado.
        </div>
      </Card>

      {stepError ? (
        <p
          className="flex items-center gap-1.5 text-sm font-semibold text-error lg:sticky lg:bottom-16 lg:z-[6] lg:rounded-[7px] lg:bg-error/10 lg:px-3 lg:py-2"
          role="alert"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {stepError}
        </p>
      ) : null}

      {step > 0 ? (
        <FormActions>
          <Button type="button" variant="ghost" onClick={goBack}>
            Atrás
          </Button>
          {step === 1 ? (
            <Button type="button" onClick={continueFromStep1} disabled={isSearching}>
              {isSearching ? "Verificando…" : "Continuar"}
            </Button>
          ) : null}
          {step === 2 ? (
            <Button type="button" onClick={continueFromStep2}>
              Continuar
            </Button>
          ) : null}
          {step === 3 ? (
            <Button type="button" onClick={() => setStep(4)}>
              Continuar
            </Button>
          ) : null}
          {step === 4 ? (
            <SubmitButton pendingLabel="Registrando...">Finalizar y registrar paciente</SubmitButton>
          ) : null}
        </FormActions>
      ) : null}
    </form>
  );
}
