import Link from "next/link";
import { OperationalQueueRefresh } from "@/components/internal/OperationalQueueRefresh";
import { VisitOperationalStatusPill } from "@/components/internal/StatusPill";
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
  getConsultationDailyVisits,
  getConsultationVisits
} from "@/modules/database/queries/clinical-care";
import { autoAbandonUnattendedConsultationVisits } from "@/modules/database/queries/visit-discontinuations";
import { getTreatmentProposalOutcomeSummary } from "@/modules/database/queries/treatment-proposals";
import { requirePermission } from "@/modules/permissions";
import { ArrowRight, CheckCircle2, Clock3, Percent, XCircle } from "lucide-react";
import { getBranchContext } from "@/features/branches/context";

const emptyConsultationsMessage = (
  <>
    <span className="block font-semibold text-text">No hay pacientes registrados hoy.</span>
    <span className="mt-1 block text-sm text-muted">
      Los pacientes aparecerán aquí cuando Recepción registre su llegada.
    </span>
  </>
);

function visitHasPaidSale(visit: {
  sales?: Array<{ status: string; balanceCents: number }>;
}) {
  return visit.sales?.some((sale) => sale.status === "paid" && sale.balanceCents === 0) ?? false;
}

function dailyVisitHref(visit: {
  id: string;
  status: string;
  patient: { id: string };
}) {
  return visit.status === "in_consultation"
    ? `/sigeco/consultas/${visit.id}`
    : `/sigeco/recepcion/pacientes/${visit.patient.id}`;
}

export default async function ConsultationsPage() {
  const user = await requirePermission("clinical_read");
  const { activeBranch } = await getBranchContext(user);
  // Barrido perezoso: cierra por abandono ("no atendido") a quienes fueron
  // derivados al médico pero no entraron a la consulta dentro de su día, antes de
  // leer la bandeja para que no aparezcan en la lista del día de hoy.
  await autoAbandonUnattendedConsultationVisits({ branchCode: activeBranch.code });
  const [visits, dailyVisits, proposalSummary] = await Promise.all([
    getConsultationVisits({ pageSize: 30, branchCode: activeBranch.code }),
    getConsultationDailyVisits({ pageSize: 80, branchCode: activeBranch.code }),
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

      <DesktopTableToolbar count={`${dailyVisits.length} pacientes del día`} />

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Pacientes del día"
          description="Atendidos, pagados, abandonados y activos en cualquier área durante el día operativo actual."
        />
        <RecordList>
          {dailyVisits.map((visit) => (
            <RecordItem
              key={visit.id}
              href={dailyVisitHref(visit)}
              title={visit.patient.fullName}
              status={
                <VisitOperationalStatusPill
                  status={visit.status}
                  paid={visitHasPaidSale(visit)}
                />
              }
            >
              <span className="tabular-nums">
                {formatDateTime(visit.checkedInAt)} ·{" "}
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
          {dailyVisits.length === 0 ? (
            <RecordListEmpty>{emptyConsultationsMessage}</RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Pacientes del día">
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
              {dailyVisits.map((visit) => (
                <Tr key={visit.id}>
                  <Td className="font-semibold text-text">
                    <Link
                      href={dailyVisitHref(visit)}
                      className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                    >
                      {visit.patient.fullName}
                    </Link>
                    <span className="block text-[11px] font-normal tabular-nums text-muted">
                      {visit.patient.internalCode}
                    </span>
                  </Td>
                  <Td className="tabular-nums lg:hidden xl:table-cell">{visit.patient.phone}</Td>
                  <Td className="tabular-nums">{formatDateTime(visit.checkedInAt)}</Td>
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
                    <VisitOperationalStatusPill
                      status={visit.status}
                      paid={visitHasPaidSale(visit)}
                    />
                  </Td>
                </Tr>
              ))}
              {dailyVisits.length === 0 ? (
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

    </div>
  );
}
