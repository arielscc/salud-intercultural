import type { PatientCaptureSource, PatientGender } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import {
  patientCaptureSourceLabels,
  patientGenderLabels
} from "@/features/patients/labels";
import { createPatientAction } from "@/features/patients/actions";
import { requirePermission } from "@/modules/permissions";

const genderOptions = Object.entries(patientGenderLabels) as Array<[PatientGender, string]>;
const sourceOptions = Object.entries(patientCaptureSourceLabels) as Array<[PatientCaptureSource, string]>;

type NewPatientPageProps = {
  searchParams: Promise<{
    duplicatePhone?: string;
    error?: string;
    leadId?: string;
    name?: string;
    phone?: string;
    city?: string;
  }>;
};

export default async function NewPatientPage({ searchParams }: NewPatientPageProps) {
  await requirePermission("patients_create");
  const params = await searchParams;

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm font-semibold text-muted">Recepción</p>
        <h2 className="font-sora text-2xl font-bold">Nuevo paciente</h2>
      </section>

      {params.duplicatePhone ? (
        <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4 text-sm text-text">
          <p className="font-bold">Posible paciente duplicado</p>
          <p className="mt-1 text-muted">
            Ya existe un paciente con el teléfono {params.duplicatePhone}. Revisa antes de continuar.
          </p>
        </div>
      ) : null}

      <form action={createPatientAction} className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        {params.duplicatePhone ? <input type="hidden" name="allowDuplicate" value="true" /> : null}
        {params.leadId ? <input type="hidden" name="sourceLeadId" value={params.leadId} /> : null}
        <Field label="Nombre completo">
          <input
            className={internalInputClassName}
            name="fullName"
            autoComplete="name"
            defaultValue={params.name}
            required
          />
        </Field>
        <Field label="Teléfono">
          <input
            className={internalInputClassName}
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={params.duplicatePhone ?? params.phone}
            required
          />
        </Field>
        <Field label="Teléfono alternativo">
          <input className={internalInputClassName} name="secondaryPhone" type="tel" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de nacimiento">
            <input className={internalInputClassName} name="birthDate" type="date" />
          </Field>
          <Field label="Género">
            <select className={internalInputClassName} name="gender" defaultValue="unknown">
              {genderOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ciudad">
            <input className={internalInputClassName} name="city" defaultValue={params.city} />
          </Field>
          <Field label="Departamento">
            <input className={internalInputClassName} name="department" />
          </Field>
        </div>
        <Field label="Dirección">
          <input className={internalInputClassName} name="address" />
        </Field>
        <Field label="Fuente de captación">
          <select className={internalInputClassName} name="captureSource" defaultValue="whatsapp">
            {sourceOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Alergias">
          <textarea className={`${internalInputClassName} min-h-24 py-3`} name="allergies" />
        </Field>
        <Field label="Antecedentes relevantes">
          <textarea className={`${internalInputClassName} min-h-28 py-3`} name="relevantHistory" />
        </Field>
        <Field label="Observaciones generales">
          <textarea className={`${internalInputClassName} min-h-28 py-3`} name="generalObservations" />
        </Field>
        <button
          type="submit"
          className="focus-ring min-h-12 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-soft"
        >
          Crear paciente
        </button>
      </form>
    </div>
  );
}
