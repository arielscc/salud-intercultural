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
import {
  getConsultationAbandonedToday,
  getConsultationVisits
} from "@/modules/database/queries/clinical-care";
import { autoAbandonUnattendedConsultationVisits } from "@/modules/database/queries/visit-discontinuations";
import { getTreatmentProposalOutcomeSummary } from "@/modules/database/queries/treatment-proposals";
import { requirePermission } from "@/modules/permissions";
import { ArrowRight, CheckCircle2, Clock3, Percent, XCircle } from "lucide-react";
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
  // Barrido perezoso: cierra por abandono ("no atendido") a quienes fueron
  // derivados al médico pero no entraron a la consulta dentro de su día, antes de
  // leer la bandeja para que no aparezcan en la lista del día de hoy.
  await autoAbandonUnattendedConsultationVisits({ branchCode: activeBranch.code });
  const [visits, abandonedToday, proposalSummary] = await Promise.all([
    getConsultationVisits({ pageSize: 30, branchCode: activeBranch.code }),
    getConsultationAbandonedToday(activeBranch.code),
    getTreatmentProposalOutcomeSummary(new Date(), activeBranch.code)
  ]);

  // Pacientes derivados al médico que nadie ha tomado aún (en espera).
  // Ya vienen ordenados por última derivación (los más recientes primero).
  const waitingArrivals = visits.filter((visit) => !visit.attendingUser);

  return (
    <div className="grid gap-4">
      <PageHeader title="Consultas" description="Atención médica" />

      <OperationalQueueRefresh
        queueKey="consultations"
        serverUpdatedAt={new Date().toISOString()}
      />

      {waitingArrivals.length > 0 ? (
        <section
          className="payment-weave overflow-hidden rounded-[8px] border border-primary/25 bg-surface-soft shadow-lg"
          aria-label="Pacientes derivados al médico en espera"
        >
          <div className="grid gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase text-primary-dark">
                Derivados al médico
              </p>
              <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                {waitingArrivals.length} en espera
              </span>
            </div>
            <div className="grid gap-2">
              {waitingArrivals.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/sigeco/consultas/${visit.id}`}
                  className="focus-ring flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-primary/20 bg-surface px-3 py-2.5 hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-sora text-sm font-bold text-text">
                      {visit.patient.fullName}
                    </p>
                    <p className="truncate text-xs text-muted">
                      <span className="tabular-nums">{visit.patient.internalCode}</span>
                      <span className="px-1.5" aria-hidden="true">·</span>
                      {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-muted">
                      Derivado {formatDateTime(visit.derivedToDoctorAt)}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-dark">
                    Atender
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

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
                {formatDateTime(visit.derivedToDoctorAt)} ·{" "}
                {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}
              </span>
              <span className="tabular-nums">{visit.patient.phone}</span>
              {visit.attendingUser ? (
                <span className="font-medium text-primary-dark">
                  Atiende: {visit.attendingUser.name ?? visit.attendingUser.email}
                </span>
              ) : (
                <span className="text-muted">Sin asignar</span>
              )}
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
                <Th>Atiende</Th>
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
                  <Td className="tabular-nums">{formatDateTime(visit.derivedToDoctorAt)}</Td>
                  <Td>{visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}</Td>
                  <Td>
                    {visit.attendingUser ? (
                      <span className="font-medium text-primary-dark">
                        {visit.attendingUser.name ?? visit.attendingUser.email}
                      </span>
                    ) : (
                      <span className="text-muted">Sin asignar</span>
                    )}
                  </Td>
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
                  <Td className="py-8 text-center" colSpan={7}>
                    {emptyConsultationsMessage}
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </RecordTable>
      </Card>

      {abandonedToday.length > 0 ? (
        <Card className="p-0">
          <CardHeader
            className="mb-0 p-[18px] pb-3"
            title="Pacientes que abandonaron (hoy)"
            description="Derivados al médico que no entraron a la consulta dentro del día. Se cerraron como abandono automáticamente."
          />
          <RecordList>
            {abandonedToday.map((entry) => (
              <RecordItem
                key={entry.id}
                title={entry.visit.patient.fullName}
                status={
                  <Chip tone="error" dot>
                    No atendido
                  </Chip>
                }
              >
                <span className="tabular-nums">{entry.visit.patient.internalCode}</span>
                <span className="tabular-nums">{entry.visit.patient.phone}</span>
                <span className="tabular-nums">Abandonó {formatDateTime(entry.createdAt)}</span>
              </RecordItem>
            ))}
          </RecordList>
          <RecordTable>
            <Table caption="Pacientes que abandonaron hoy">
              <thead>
                <tr>
                  <Th>Paciente</Th>
                  <Th className="lg:hidden xl:table-cell">Teléfono</Th>
                  <Th>Abandonó</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {abandonedToday.map((entry) => (
                  <Tr key={entry.id}>
                    <Td className="font-semibold text-text">
                      {entry.visit.patient.fullName}
                      <span className="block text-[11px] font-normal tabular-nums text-muted">
                        {entry.visit.patient.internalCode}
                      </span>
                    </Td>
                    <Td className="tabular-nums lg:hidden xl:table-cell">
                      {entry.visit.patient.phone}
                    </Td>
                    <Td className="tabular-nums">{formatDateTime(entry.createdAt)}</Td>
                    <Td>
                      <Chip tone="error" dot>
                        No atendido
                      </Chip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </RecordTable>
        </Card>
      ) : null}
    </div>
  );
}
