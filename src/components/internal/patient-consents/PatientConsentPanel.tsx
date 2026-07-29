import Link from "next/link";
import type {
  InternalRole,
  PatientConsent,
  PatientConsentCaptureMethod,
  PatientConsentDecision,
  PatientConsentPurpose,
  PatientContactChannel
} from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { recordPatientConsentAction } from "@/features/patient-consents/actions";
import {
  isContactConsentPurpose,
  patientConsentPurposeLabels,
  patientConsentTexts,
  patientContactChannelLabels,
  PATIENT_CONSENT_TEXT_VERSION
} from "@/features/patient-consents/texts";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/cn";

type ConsentWithActor = PatientConsent & {
  recordedBy: { name: string | null } | null;
};

const purposes = Object.keys(
  patientConsentPurposeLabels
) as PatientConsentPurpose[];

const decisionLabels: Record<PatientConsentDecision, string> = {
  granted: "Autorizado",
  denied: "No autorizado",
  withdrawn: "Retirado"
};

const captureMethodLabels: Record<PatientConsentCaptureMethod, string> = {
  in_person_verbal: "Confirmación verbal en clínica",
  written_form: "Formulario escrito",
  phone_call: "Llamada",
  whatsapp: "WhatsApp",
  digital_form: "Formulario digital",
  legacy_record: "Registro anterior"
};

function channelsLabel(channels: PatientContactChannel[]) {
  return channels.map((channel) => patientContactChannelLabels[channel]).join(" y ");
}

export function PatientConsentPanel({
  patientId,
  consents,
  role,
  purposeFilter,
  decisionFilter
}: {
  patientId: string;
  consents: ConsentWithActor[];
  role: InternalRole;
  purposeFilter?: PatientConsentPurpose;
  decisionFilter?: PatientConsentDecision;
}) {
  const canWrite = roleHasPermission(role, "patient_consents_write");
  const currentByPurpose = new Map<PatientConsentPurpose, ConsentWithActor>();

  for (const consent of consents) {
    if (!currentByPurpose.has(consent.purpose)) {
      currentByPurpose.set(consent.purpose, consent);
    }
  }

  const filteredHistory = consents.filter(
    (consent) =>
      (!purposeFilter || consent.purpose === purposeFilter) &&
      (!decisionFilter || consent.decision === decisionFilter)
  );
  const basePath = `/sigeco/recepcion/pacientes/${patientId}`;

  return (
    <Card className="max-sm:order-2">
      <CardHeader
        title="Consentimientos y contacto"
        description="Cada autorización tiene un fin independiente. Una autorización no permite usar los datos para otro fin."
      />

      <div className="grid gap-3">
        {purposes.map((purpose) => {
          const current = currentByPurpose.get(purpose);
          const contactPurpose = isContactConsentPurpose(purpose);

          return (
            <section
              key={purpose}
              className="rounded-[10px] border border-border bg-surface-soft/45 p-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-text">
                    {patientConsentPurposeLabels[purpose]}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {patientConsentTexts[purpose]}
                  </p>
                </div>
                <Chip
                  tone={
                    current?.decision === "granted"
                      ? "success"
                      : current
                        ? "warning"
                        : "neutral"
                  }
                >
                  {current ? decisionLabels[current.decision] : "Sin decisión"}
                </Chip>
              </div>

              {current ? (
                <p className="mt-2 text-xs text-muted">
                  {formatDateTime(current.decidedAt)}
                  {current.contactChannels.length > 0
                    ? ` · ${channelsLabel(current.contactChannels)}`
                    : ""}
                  {` · ${captureMethodLabels[current.captureMethod]}`}
                </p>
              ) : null}

              {canWrite ? (
                <form
                  action={recordPatientConsentAction}
                  className="mt-3 grid gap-3 border-t border-border pt-3"
                >
                  <input type="hidden" name="patientId" value={patientId} />
                  <input type="hidden" name="purpose" value={purpose} />
                  <input
                    type="hidden"
                    name="textVersion"
                    value={PATIENT_CONSENT_TEXT_VERSION}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Decisión del paciente">
                      <select
                        className={internalInputClassName}
                        name="decision"
                        defaultValue="granted"
                      >
                        <option value="granted">Sí autoriza</option>
                        <option value="denied">No autoriza</option>
                        {current?.decision === "granted" ? (
                          <option value="withdrawn">Retira su autorización</option>
                        ) : null}
                      </select>
                    </Field>
                    <Field label="Cómo se confirmó">
                      <select
                        className={internalInputClassName}
                        name="captureMethod"
                        defaultValue="in_person_verbal"
                      >
                        <option value="in_person_verbal">Verbalmente en clínica</option>
                        <option value="written_form">Formulario escrito</option>
                        <option value="phone_call">Por llamada</option>
                        <option value="whatsapp">Por WhatsApp</option>
                        <option value="digital_form">Formulario digital</option>
                      </select>
                    </Field>
                  </div>
                  {contactPurpose ? (
                    <fieldset className="grid gap-1.5">
                      <legend className="text-[13px] font-medium text-text">
                        Canales que autoriza al responder “Sí”
                      </legend>
                      <div className="flex flex-wrap gap-4 text-sm text-text">
                        <label className="flex min-h-10 items-center gap-2">
                          <input
                            type="checkbox"
                            name="contactChannels"
                            value="whatsapp"
                          />
                          WhatsApp
                        </label>
                        <label className="flex min-h-10 items-center gap-2">
                          <input
                            type="checkbox"
                            name="contactChannels"
                            value="call"
                          />
                          Llamada
                        </label>
                      </div>
                    </fieldset>
                  ) : null}
                  <SubmitButton size="sm" className="justify-self-start">
                    Guardar decisión
                  </SubmitButton>
                </form>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-text">Historial comprobable</h3>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Link className={cn("text-primary-dark hover:underline")} href={basePath}>
            Todos
          </Link>
          {purposes.map((purpose) => (
            <Link
              key={purpose}
              className="text-primary-dark hover:underline"
              href={`${basePath}?consentimiento=${purpose}`}
            >
              {patientConsentPurposeLabels[purpose]}
            </Link>
          ))}
          <Link
            className="text-primary-dark hover:underline"
            href={`${basePath}?decision=withdrawn`}
          >
            Retirados
          </Link>
        </div>
        <div className="mt-3 grid gap-2">
          {filteredHistory.map((consent) => (
            <div
              key={consent.id}
              className="rounded-[9px] border border-border px-3 py-2 text-xs text-muted"
            >
              <p className="font-semibold text-text">
                {patientConsentPurposeLabels[consent.purpose]} ·{" "}
                {decisionLabels[consent.decision]}
              </p>
              <p className="mt-1">
                {formatDateTime(consent.decidedAt)} · versión {consent.textVersion} ·{" "}
                {captureMethodLabels[consent.captureMethod]}
                {consent.recordedBy?.name
                  ? ` · registró ${consent.recordedBy.name}`
                  : ""}
              </p>
              <details className="mt-1">
                <summary className="cursor-pointer text-primary-dark">
                  Ver texto exacto
                </summary>
                <p className="mt-1 leading-relaxed">{consent.textSnapshot}</p>
              </details>
            </div>
          ))}
          {filteredHistory.length === 0 ? (
            <p className="text-sm text-muted">No hay registros para este filtro.</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
