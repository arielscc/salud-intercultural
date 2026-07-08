import type { PatientCaptureSource, PatientGender } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { Button } from "@/components/internal/ui/Button";
import { Card } from "@/components/internal/ui/Card";
import { PageHeader } from "@/components/internal/ui/PageHeader";
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
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <PageHeader title="Nuevo paciente" description="Recepción" />

      {params.duplicatePhone ? (
        <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            Posible paciente duplicado
          </p>
          <p className="mt-1 text-muted">
            Ya existe un paciente con el teléfono {params.duplicatePhone}. Revisa antes de continuar.
          </p>
        </div>
      ) : null}

      <Card>
        <form action={createPatientAction} className="grid gap-4">
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit">Crear paciente</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
