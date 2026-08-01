import Link from "next/link";
import { OperationalQueueRefresh } from "@/components/internal/OperationalQueueRefresh";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopTableToolbar } from "@/components/internal/ui/DesktopTableToolbar";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { routeAreaLabels } from "@/features/patients/labels";
import { formatDateTime } from "@/lib/dates";
import { getConsultationVisits } from "@/modules/database/queries/clinical-care";
import { getTreatmentProposalOutcomeSummary } from "@/modules/database/queries/treatment-proposals";
import { requirePermission } from "@/modules/permissions";
import { CheckCircle2, Clock3, Percent, XCircle } from "lucide-react";
import { getBranchContext } from "@/features/branches/context";

const emptyConsultationsMessage = (
  <>
    <span className="block font-semibold text-text">No hay pacientes en consulta.</span>
    <span className="mt-1 block text-sm text-muted">
      Recepción debe derivar una visita al área médica.
    </span>
  </>
);

export default async function ConsultationsPage() {
  const user = await requirePermission("clinical_read");
  const { activeBranch } = await getBranchContext(user);
  const [visits, proposalSummary] = await Promise.all([
    getConsultationVisits({ pageSize: 30, branchCode: activeBranch.code }),
    getTreatmentProposalOutcomeSummary(new Date(), activeBranch.code)
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Consultas" description="Atención médica" />

      <OperationalQueueRefresh
        queueKey="consultations"
        serverUpdatedAt={new Date().toISOString()}
      />

      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <KpiCard
          icon={CheckCircle2}
          label="Aceptados este mes"
          value={proposalSummary.accepted}
          compactMobile
        />
        <KpiCard
          icon={XCircle}
          label="Rechazados este mes"
          value={proposalSummary.rejected}
          compactMobile
        />
        <KpiCard
          icon={Clock3}
          label="Necesitan tiempo"
          value={proposalSummary.needs_time}
          compactMobile
        />
        <KpiCard
          icon={Percent}
          label="Aceptación decidida"
          value={`${proposalSummary.acceptanceRate}%`}
          compactMobile
        />
      </section>

      <DesktopTableToolbar count={`${visits.length} pacientes en atención`} />

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Pacientes en atención médica"
          description="Visitas derivadas a consulta que permanecen dentro del flujo clínico."
        />
        <RecordList>
          {visits.map((visit) => (
            <RecordItem
              key={visit.id}
              href={`/sigeco/consultas/${visit.id}`}
              title={visit.patient.fullName}
              status={<VisitStatusPill status={visit.status} />}
            >
              <span className="tabular-nums">
                {formatDateTime(visit.checkedInAt)} ·{" "}
                {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}
              </span>
              <span className="tabular-nums">{visit.patient.phone}</span>
              {visit.clinicalConsultation ? (
                <span>
                  <Chip tone="success" dot>
                    Registrada
                  </Chip>
                </span>
              ) : null}
            </RecordItem>
          ))}
          {visits.length === 0 ? (
            <RecordListEmpty>{emptyConsultationsMessage}</RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Pacientes en consulta">
            <thead>
              <tr>
                <Th>Paciente</Th>
                <Th className="lg:hidden xl:table-cell">Teléfono</Th>
                <Th>Llegada</Th>
                <Th>Área actual</Th>
                <Th>Consulta</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <Tr key={visit.id}>
                  <Td className="font-semibold text-text">
                    <Link
                      href={`/sigeco/consultas/${visit.id}`}
                      className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                    >
                      {visit.patient.fullName}
                    </Link>
                  </Td>
                  <Td className="tabular-nums lg:hidden xl:table-cell">{visit.patient.phone}</Td>
                  <Td className="tabular-nums">{formatDateTime(visit.checkedInAt)}</Td>
                  <Td>{visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}</Td>
                  <Td>
                    {visit.clinicalConsultation ? (
                      <Chip tone="success" dot>
                        Registrada
                      </Chip>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <VisitStatusPill status={visit.status} />
                  </Td>
                </Tr>
              ))}
              {visits.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={6}>
                    {emptyConsultationsMessage}
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </RecordTable>
      </Card>
    </div>
  );
}
