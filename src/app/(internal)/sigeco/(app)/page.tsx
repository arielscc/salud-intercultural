import Link from "next/link";
import { AlertCircle, BellRing, Boxes, PhoneCall, Plus, UserRoundSearch } from "lucide-react";
import { getFollowUpWorkSummary } from "@/modules/database/queries/follow-ups";
import { getInventorySummary } from "@/modules/database/queries/inventory";
import { getInternalLeadWorkSummary, getInternalLeads } from "@/modules/database/queries/leads-v3";
import { requireInternalUser } from "@/modules/permissions";
import { leadSourceLabels } from "@/features/crm/labels";
import { LeadStatusPill } from "@/components/internal/StatusPill";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { cn } from "@/lib/cn";

export default async function SigecoDashboardPage() {
  const user = await requireInternalUser();
  const summary = await getInternalLeadWorkSummary(
    user.role === "captacion" ? user.id : undefined
  );
  const followUpSummary = await getFollowUpWorkSummary(user.role === "captacion" ? user.id : undefined);
  const inventorySummary = await getInventorySummary();
  const recentLeads = await getInternalLeads({ pageSize: 5 });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Trabajo de hoy"
        description="Panel operativo"
        actions={
          <Link href="/sigeco/leads/nuevo" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo lead
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard icon={UserRoundSearch} label="Leads nuevos" value={summary.newLeads} />
        <KpiCard
          icon={BellRing}
          label="Recordatorios vencidos"
          value={summary.pendingReminders}
          flag={
            summary.pendingReminders > 0 ? { tone: "warn", label: "Atender hoy" } : undefined
          }
        />
        <KpiCard icon={AlertCircle} label="No responden" value={summary.noAnswer} />
        <KpiCard icon={PhoneCall} label="Seguimientos hoy" value={followUpSummary.today} />
        <KpiCard
          icon={Boxes}
          label="Stock bajo"
          value={inventorySummary.lowStock}
          flag={inventorySummary.lowStock > 0 ? { tone: "crit", label: "Reponer" } : undefined}
        />
      </section>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Leads recientes"
          description="Últimos movimientos del pipeline comercial."
          action={
            <Link
              href="/sigeco/leads"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Ver todos
            </Link>
          }
        />
        <Table>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Teléfono</Th>
              <Th>Origen</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {recentLeads.map((lead) => (
              <Tr key={lead.id}>
                <Td className="font-semibold text-text">
                  <Link
                    href={`/sigeco/leads/${lead.id}`}
                    className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                  >
                    {lead.name || "Sin nombre"}
                  </Link>
                </Td>
                <Td className="tabular-nums">{lead.phone}</Td>
                <Td>{leadSourceLabels[lead.source]}</Td>
                <Td>
                  <LeadStatusPill status={lead.status} />
                </Td>
              </Tr>
            ))}
            {recentLeads.length === 0 ? (
              <tr>
                <Td className="py-6 text-center" colSpan={4}>
                  Aún no hay leads internos.
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
