import type { InternalLeadSource } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { Button } from "@/components/internal/ui/Button";
import { Card } from "@/components/internal/ui/Card";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { leadSourceLabels } from "@/features/crm/labels";
import { createInternalLeadAction } from "@/features/crm/actions";
import { requirePermission } from "@/modules/permissions";

const sourceOptions = Object.entries(leadSourceLabels) as Array<[InternalLeadSource, string]>;

export default async function NewInternalLeadPage() {
  await requirePermission("leads_create");

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <PageHeader title="Nuevo lead" description="CRM interno" />

      <Card>
        <form action={createInternalLeadAction} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Field label="Fecha estimada de visita">
              <input className={internalInputClassName} name="estimatedVisitDate" type="date" />
            </Field>
          </div>
          <Field label="Síntomas generales">
            <textarea className={`${internalInputClassName} min-h-28 py-3`} name="symptoms" />
          </Field>
          <Field label="Intención de visita">
            <input className={internalInputClassName} name="intentionToVisit" />
          </Field>
          <Field label="Observaciones comerciales">
            <textarea className={`${internalInputClassName} min-h-28 py-3`} name="commercialNotes" />
          </Field>
          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit">Crear lead</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
