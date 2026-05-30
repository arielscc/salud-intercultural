import type { InternalLeadSource } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { leadSourceLabels } from "@/features/crm/labels";
import { createInternalLeadAction } from "@/features/crm/actions";
import { requirePermission } from "@/modules/permissions";

const sourceOptions = Object.entries(leadSourceLabels) as Array<[InternalLeadSource, string]>;

export default async function NewInternalLeadPage() {
  await requirePermission("leads_create");

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm font-semibold text-muted">CRM interno</p>
        <h2 className="font-sora text-2xl font-bold">Nuevo lead</h2>
      </section>

      <form action={createInternalLeadAction} className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <Field label="Nombre">
          <input className={internalInputClassName} name="name" autoComplete="name" />
        </Field>
        <Field label="Teléfono">
          <input className={internalInputClassName} name="phone" type="tel" autoComplete="tel" required />
        </Field>
        <Field label="Email">
          <input className={internalInputClassName} name="email" type="email" autoComplete="email" />
        </Field>
        <Field label="Ciudad">
          <input className={internalInputClassName} name="city" autoComplete="address-level2" />
        </Field>
        <Field label="Fuente">
          <select className={internalInputClassName} name="source" defaultValue="whatsapp">
            {sourceOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Síntomas generales">
          <textarea className={`${internalInputClassName} min-h-28 py-3`} name="symptoms" />
        </Field>
        <Field label="Intención de visita">
          <input className={internalInputClassName} name="intentionToVisit" />
        </Field>
        <Field label="Fecha estimada de visita">
          <input className={internalInputClassName} name="estimatedVisitDate" type="date" />
        </Field>
        <Field label="Observaciones comerciales">
          <textarea className={`${internalInputClassName} min-h-28 py-3`} name="commercialNotes" />
        </Field>
        <button
          type="submit"
          className="focus-ring min-h-12 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-soft"
        >
          Crear lead
        </button>
      </form>
    </div>
  );
}
