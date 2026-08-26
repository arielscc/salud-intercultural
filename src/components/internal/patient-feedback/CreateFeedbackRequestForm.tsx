"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { Button } from "@/components/internal/ui/Button";
import {
  createFeedbackRequestAction
} from "@/features/patient-feedback/actions";
import { initialCreateFeedbackRequestState } from "@/features/patient-feedback/state";
import { formatDateTime } from "@/lib/dates";
import type { InternalRole } from "@/generated/prisma/client";

type VisitOption = {
  id: string;
  checkedInAt: Date;
  patient: {
    internalCode: string;
    fullName: string;
    consents: Array<{ decision: "granted" | "denied" | "withdrawn" }>;
  };
  feedbackRequests: Array<{ id: string; expiresAt: Date }>;
};

export function CreateFeedbackRequestForm({
  visits,
  owners
}: {
  visits: VisitOption[];
  owners: Array<{
    id: string;
    name: string | null;
    email: string;
    role: InternalRole;
  }>;
}) {
  const [state, action, pending] = useActionState(
    createFeedbackRequestAction,
    initialCreateFeedbackRequestState
  );
  const [copied, setCopied] = useState(false);
  const preferredOwner =
    owners.find((owner) => owner.role === "direccion") ?? owners[0];

  async function copyLink() {
    if (!state.link) return;
    await navigator.clipboard.writeText(state.link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-3 md:grid-cols-2">
        <Field label="Visita atendida" className="md:col-span-2">
          <select className={internalInputClassName} name="visitId" required>
            <option value="">Seleccionar visita</option>
            {visits.map((visit) => (
              <option key={visit.id} value={visit.id}>
                {visit.patient.fullName} · {visit.patient.internalCode} · {formatDateTime(visit.checkedInAt)}
                {visit.feedbackRequests.length > 0 ? " · reemplazará enlace abierto" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Forma de entrega">
          <select
            className={internalInputClassName}
            name="deliveryChannel"
            defaultValue="in_person"
          >
            <option value="in_person">En persona: mostrar o copiar enlace</option>
            <option value="whatsapp">WhatsApp: exige consentimiento</option>
          </select>
        </Field>
        <Field label="Responsable del caso si requiere respuesta">
          <select
            className={internalInputClassName}
            name="ownerId"
            defaultValue={preferredOwner?.id ?? ""}
            required
          >
            <option value="">Seleccionar responsable</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name ?? owner.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="El enlace vence en">
          <select
            className={internalInputClassName}
            name="expiresInDays"
            defaultValue="7"
          >
            <option value="1">1 día</option>
            <option value="3">3 días</option>
            <option value="7">7 días</option>
            <option value="14">14 días</option>
            <option value="30">30 días</option>
          </select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={pending || visits.length === 0 || owners.length === 0}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {pending ? "Creando…" : "Crear enlace seguro"}
          </Button>
        </div>
      </form>

      {state.status === "error" ? (
        <p className="rounded-[9px] bg-error/10 px-3 py-2 text-sm font-medium text-error">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" && state.link ? (
        <div className="grid gap-2 rounded-[9px] border border-success/30 bg-success/10 p-3">
          <p className="text-sm font-semibold text-success">{state.message}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className={`${internalInputClassName} font-mono text-xs`}
              value={state.link}
              readOnly
              aria-label="Enlace seguro de encuesta"
            />
            <Button type="button" variant="outline" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-muted">
            Si creas otro enlace para la misma visita, este dejará de funcionar.
          </p>
        </div>
      ) : null}
    </div>
  );
}
