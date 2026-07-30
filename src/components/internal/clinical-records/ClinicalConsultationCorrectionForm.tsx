import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import {
  clinicalCorrectionTypeOptions
} from "@/features/clinical-records/labels";
import { correctClinicalConsultationAction } from "@/features/clinical-care/actions";
import type { ClinicalSnapshot } from "@/features/clinical-records/policy";

export function ClinicalConsultationCorrectionForm({
  visitId,
  consultationId,
  expectedRevision,
  snapshot
}: {
  visitId: string;
  consultationId: string;
  expectedRevision: number;
  snapshot: ClinicalSnapshot;
}) {
  return (
    <ConfirmForm
      id="corregir-consulta"
      action={correctClinicalConsultationAction}
      notice="Corrección registrada"
      confirmTitle="Registrar nueva versión"
      confirmDescription="La versión anterior seguirá visible. Esta corrección no modificará recetas, órdenes, ventas ni aplicaciones ya registradas."
      confirmLabel="Registrar corrección"
      confirmAtAllWidths
      className="grid gap-4"
    >
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="consultationId" value={consultationId} />
      <input
        type="hidden"
        name="expectedRevision"
        value={expectedRevision}
      />
      <div className="rounded-[9px] border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-text">
        Corrige solamente la consulta. Las recetas, órdenes, cobros, ventas y
        aplicaciones ya realizadas no cambian automáticamente.
      </div>

      <Field label="Motivo de consulta">
        <textarea
          className={`${internalInputClassName} min-h-20 py-3`}
          name="motive"
          defaultValue={snapshot.motive}
          required
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo de corrección">
          <select
            className={internalInputClassName}
            name="correctionType"
            defaultValue="diagnosis"
            required
          >
            {clinicalCorrectionTypeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Motivo obligatorio">
          <input
            className={internalInputClassName}
            name="correctionReason"
            minLength={10}
            maxLength={500}
            placeholder="Ej. se digitó incorrectamente el diagnóstico"
            required
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Diagnóstico principal">
          <input
            className={internalInputClassName}
            name="primaryDiagnosis"
            defaultValue={snapshot.primaryDiagnosis}
            required
          />
        </Field>
        <Field label="Diagnóstico secundario">
          <input
            className={internalInputClassName}
            name="secondaryDiagnosis"
            defaultValue={snapshot.secondaryDiagnosis ?? ""}
          />
        </Field>
      </div>

      <Field label="Hallazgos">
        <textarea
          className={`${internalInputClassName} min-h-24 py-3`}
          name="findings"
          defaultValue={snapshot.findings ?? ""}
        />
      </Field>
      <Field label="Observaciones">
        <textarea
          className={`${internalInputClassName} min-h-24 py-3`}
          name="observations"
          defaultValue={snapshot.observations ?? ""}
        />
      </Field>
      <Field label="Plan de tratamiento">
        <textarea
          className={`${internalInputClassName} min-h-28 py-3`}
          name="treatmentPlanText"
          defaultValue={snapshot.treatmentPlanText ?? ""}
        />
      </Field>
      <Field label="Indicaciones">
        <textarea
          className={`${internalInputClassName} min-h-28 py-3`}
          name="indications"
          defaultValue={snapshot.indications ?? ""}
        />
      </Field>

      <SubmitButton variant="outline" className="w-full">
        Revisar y registrar corrección
      </SubmitButton>
    </ConfirmForm>
  );
}
