"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type {
  InternalRole,
  PatientConsent,
  PatientConsentCaptureMethod,
  PatientConsentDecision,
  PatientConsentPurpose,
  PatientContactChannel
} from "@/generated/prisma/client";
import { Field } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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

function ConsentDecisionForm({
  patientId,
  purpose,
  current
}: {
  patientId: string;
  purpose: PatientConsentPurpose;
  current?: ConsentWithActor;
}) {
  const [decision, setDecision] = useState<PatientConsentDecision | "">("");
  const contactPurpose = isContactConsentPurpose(purpose);
  const [channels, setChannels] = useState<PatientContactChannel[]>(
    current?.decision === "granted" ? current.contactChannels : []
  );
  const requiresChannel = decision === "granted" && contactPurpose;
  const canSubmit = decision !== "" && (!requiresChannel || channels.length > 0);

  function toggleChannel(channel: PatientContactChannel, checked: boolean) {
    setChannels((currentChannels) =>
      checked
        ? Array.from(new Set([...currentChannels, channel]))
        : currentChannels.filter((currentChannel) => currentChannel !== channel)
    );
  }

  return (
    <form action={recordPatientConsentAction} className="mt-3 grid gap-3">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="purpose" value={purpose} />
      <input
        type="hidden"
        name="textVersion"
        value={PATIENT_CONSENT_TEXT_VERSION}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Decisión del paciente">
          <Select
            name="decision"
            value={decision}
            onValueChange={(value) =>
              setDecision(value as PatientConsentDecision)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una decisión" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="granted">Sí autoriza</SelectItem>
              <SelectItem value="denied">No autoriza</SelectItem>
              {current?.decision === "granted" ? (
                <SelectItem value="withdrawn">
                  Retira su autorización
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Cómo se confirmó">
          <Select name="captureMethod" defaultValue="in_person_verbal">
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el medio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_person_verbal">
                Verbalmente en clínica
              </SelectItem>
              <SelectItem value="written_form">Formulario escrito</SelectItem>
              <SelectItem value="phone_call">Por llamada</SelectItem>
              <SelectItem value="whatsapp">Por WhatsApp</SelectItem>
              <SelectItem value="digital_form">Formulario digital</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      {requiresChannel ? (
        <fieldset className="grid gap-1.5">
          <legend className="text-[13px] font-medium text-text">
            Canales autorizados
          </legend>
          <div className="flex flex-wrap gap-4 text-sm text-text">
            <label
              htmlFor={`${purpose}-whatsapp`}
              className="flex min-h-10 cursor-pointer items-center gap-2"
            >
              <Checkbox
                id={`${purpose}-whatsapp`}
                name="contactChannels"
                value="whatsapp"
                checked={channels.includes("whatsapp")}
                onCheckedChange={(checked) =>
                  toggleChannel("whatsapp", checked === true)
                }
              />
              WhatsApp
            </label>
            <label
              htmlFor={`${purpose}-call`}
              className="flex min-h-10 cursor-pointer items-center gap-2"
            >
              <Checkbox
                id={`${purpose}-call`}
                name="contactChannels"
                value="call"
                checked={channels.includes("call")}
                onCheckedChange={(checked) =>
                  toggleChannel("call", checked === true)
                }
              />
              Llamada
            </label>
          </div>
        </fieldset>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm" disabled={!canSubmit}>
          Guardar decisión
        </SubmitButton>
        <span className="text-xs text-muted">
          Al guardar, esta sección se cerrará. El registro anterior no se edita.
        </span>
      </div>
    </form>
  );
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
  const [openPurpose, setOpenPurpose] = useState<PatientConsentPurpose | null>(
    null
  );
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

          return (
            <Collapsible
              key={purpose}
              open={openPurpose === purpose}
              onOpenChange={(open) => setOpenPurpose(open ? purpose : null)}
              className="rounded-[10px] border border-border bg-surface-soft/45"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="focus-ring flex w-full items-start justify-between gap-3 rounded-[10px] p-3.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-text">
                      {patientConsentPurposeLabels[purpose]}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {current
                        ? `${formatDateTime(current.decidedAt)}${
                            current.contactChannels.length > 0
                              ? ` · ${channelsLabel(current.contactChannels)}`
                              : ""
                          } · ${captureMethodLabels[current.captureMethod]}`
                        : "Abre para registrar la decisión del paciente."}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
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
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted transition-transform",
                        openPurpose === purpose && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-border px-3.5 py-4">
                  <p className="text-xs leading-relaxed text-muted">
                    {patientConsentTexts[purpose]}
                  </p>

                  {canWrite ? (
                    <ConsentDecisionForm
                      patientId={patientId}
                      purpose={purpose}
                      current={current}
                    />
                  ) : (
                    <p className="mt-3 text-xs text-muted">
                      Tu rol puede consultar esta decisión, pero no modificarla.
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
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
