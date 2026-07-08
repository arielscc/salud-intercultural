import Link from "next/link";
import { Plus } from "lucide-react";
import type { InternalLeadSource, InternalLeadStatus } from "@/generated/prisma/client";
import { LeadStatusPill } from "@/components/internal/StatusPill";
import { internalInputClassName } from "@/components/internal/Field";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card } from "@/components/internal/ui/Card";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { leadSourceLabels, leadStatusLabels } from "@/features/crm/labels";
import { getInternalLeads } from "@/modules/database/queries/leads-v3";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

const statusOptions = Object.entries(leadStatusLabels) as Array<[InternalLeadStatus, string]>;
const sourceOptions = Object.entries(leadSourceLabels) as Array<[InternalLeadSource, string]>;

type LeadsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: InternalLeadStatus;
    source?: InternalLeadSource;
  }>;
};

export default async function InternalLeadsPage({ searchParams }: LeadsPageProps) {
  await requirePermission("leads_read");
  const params = await searchParams;
  const leads = await getInternalLeads({
    search: params.search,
    status: params.status,
    source: params.source,
    pageSize: 30
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Leads"
        description="CRM interno"
        actions={
          <Link href="/sigeco/leads/nuevo" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo lead
          </Link>
        }
      />

      <Card>
        <form className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            className={internalInputClassName}
            type="search"
            name="search"
            placeholder="Buscar por nombre, teléfono, email o ciudad"
            defaultValue={params.search}
          />
          <select className={internalInputClassName} name="status" defaultValue={params.status ?? ""}>
            <option value="">Todos los estados</option>
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className={internalInputClassName} name="source" defaultValue={params.source ?? ""}>
            <option value="">Todas las fuentes</option>
            {sourceOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <Table>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Teléfono</Th>
              <Th>Origen</Th>
              <Th>Interés</Th>
              <Th>Estado</Th>
              <Th>Próx. recordatorio</Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <Tr key={lead.id}>
                <Td className="font-semibold text-text">
                  <Link
                    href={`/sigeco/leads/${lead.id}`}
                    className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                  >
                    {lead.name || "Sin nombre"}
                  </Link>
                  {lead.city ? (
                    <span className="block text-[11px] font-normal text-muted">{lead.city}</span>
                  ) : null}
                </Td>
                <Td className="tabular-nums">{lead.phone}</Td>
                <Td>{leadSourceLabels[lead.source]}</Td>
                <Td className="max-w-[220px] truncate">{lead.intentionToVisit || "—"}</Td>
                <Td>
                  <LeadStatusPill status={lead.status} />
                </Td>
                <Td className="tabular-nums">
                  {lead.reminders[0] ? lead.reminders[0].dueAt.toLocaleDateString("es-BO") : "—"}
                </Td>
              </Tr>
            ))}
            {leads.length === 0 ? (
              <tr>
                <Td className="py-8 text-center" colSpan={6}>
                  <span className="block font-semibold text-text">No hay leads con esos filtros.</span>
                  <span className="mt-1 block text-sm text-muted">
                    Crea un lead nuevo o ajusta la búsqueda.
                  </span>
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
