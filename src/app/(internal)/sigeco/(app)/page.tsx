import Link from "next/link";
import {
  Activity,
  Boxes,
  ClockAlert,
  PhoneCall,
  Search,
  UserRoundPlus,
  UsersRound,
  UserX
} from "lucide-react";
import type { PatientRouteArea } from "@/generated/prisma/client";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { routeAreaLabels } from "@/features/patients/labels";
import { formatTime } from "@/lib/dates";
import { getFollowUpWorkSummary } from "@/modules/database/queries/follow-ups";
import { getInventorySummary } from "@/modules/database/queries/inventory";
import { getReceptionDashboardSummary } from "@/modules/database/queries/reception";
import { requireInternalUser } from "@/modules/permissions";
import { cn } from "@/lib/cn";

const emptyArrivalsMessage = (
  <>
    <span className="block font-semibold text-text">Todavía no hay llegadas hoy.</span>
    <span className="mt-1 block text-sm text-muted">
      Registra al primer paciente desde el acceso rápido.
    </span>
  </>
);

const operationalAreas: PatientRouteArea[] = [
  "recepcion",
  "medico",
  "enfermeria",
  "administracion",
  "seguimiento"
];

export default async function SigecoDashboardPage() {
  const user = await requireInternalUser();
  const canSeeReception = roleHasPermission(user.role, "visits_read");
  const canSeePatients = roleHasPermission(user.role, "patients_read");
  const canSeeFollowUps = roleHasPermission(user.role, "followups_read");
  const canSeeInventory = roleHasPermission(user.role, "inventory_read");
  const canRegisterArrival = roleHasPermission(user.role, "visits_create");

  const [receptionSummary, followUpSummary, inventorySummary] = await Promise.all([
    canSeeReception ? getReceptionDashboardSummary() : null,
    canSeeFollowUps ? getFollowUpWorkSummary(undefined, user.role) : null,
    canSeeInventory ? getInventorySummary() : null
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Trabajo de hoy"
        description="Resumen operativo de la clínica"
        actionsClassName="w-full sm:w-auto"
        actions={
          canRegisterArrival || canSeePatients ? (
            <>
              {canSeePatients ? (
                <Link
                  href="/sigeco/recepcion?vista=pacientes"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 sm:flex-none")}
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Buscar paciente
                </Link>
              ) : null}
              {canRegisterArrival ? (
                <Link
                  href="/sigeco/recepcion/nuevo"
                  className={cn(buttonVariants({ size: "sm" }), "flex-1 sm:flex-none")}
                >
                  <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
                  Registrar llegada
                </Link>
              ) : null}
            </>
          ) : undefined
        }
      />

      {!receptionSummary && !followUpSummary && !inventorySummary ? (
        <Card>
          <p className="text-sm font-semibold text-text">Tu rol no tiene módulos asignados.</p>
          <p className="mt-1 text-sm text-muted">
            Pide a dirección que actualice tu rol para ver el trabajo del día.
          </p>
        </Card>
      ) : null}

      <section className="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        {receptionSummary ? (
          <>
            <KpiCard
              icon={UsersRound}
              tone="primary"
              label="Pacientes de hoy"
              value={receptionSummary.patientsToday}
              note="Llegadas únicas"
            />
            <KpiCard
              icon={Activity}
              tone="secondary"
              label="Visitas activas"
              value={receptionSummary.activeTotal}
              flag={
                receptionSummary.activeTotal > 0 ? { tone: "warn", label: "En atención" } : undefined
              }
            />
            <KpiCard
              icon={UserX}
              tone="error"
              label="Abandonos hoy"
              value={receptionSummary.abandonmentsToday}
              flag={
                receptionSummary.abandonmentsToday > 0
                  ? { tone: "crit", label: "Revisar" }
                  : undefined
              }
            />
          </>
        ) : null}
        {followUpSummary ? (
          <>
            <KpiCard
              icon={PhoneCall}
              tone="accent"
              label="Seguimientos hoy"
              value={followUpSummary.today}
              flag={followUpSummary.today > 0 ? { tone: "warn", label: "Contactar" } : undefined}
            />
            <KpiCard
              icon={ClockAlert}
              tone="primary-dark"
              label="Seguimientos vencidos"
              value={followUpSummary.overdue}
              flag={followUpSummary.overdue > 0 ? { tone: "crit", label: "Atrasados" } : undefined}
            />
          </>
        ) : null}
        {inventorySummary ? (
          <KpiCard
            icon={Boxes}
            tone="muted"
            label="Stock bajo"
            value={inventorySummary.lowStock}
            flag={inventorySummary.lowStock > 0 ? { tone: "crit", label: "Reponer" } : undefined}
          />
        ) : null}
      </section>

      {receptionSummary ? (
        <section className="grid items-start gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <Card>
            <CardHeader
              title="Visitas activas por área"
              description={`${receptionSummary.activeTotal} pacientes dentro del flujo`}
            />
            <div className="grid gap-2">
              {operationalAreas.map((area) => (
                <div
                  key={area}
                  className="flex min-h-10 items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
                >
                  <span className="text-sm font-medium text-text">{routeAreaLabels[area]}</span>
                  <Chip tone={receptionSummary.activeByArea[area] > 0 ? "primary" : "neutral"}>
                    {receptionSummary.activeByArea[area]}
                  </Chip>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-0">
            <div className="px-[18px] pt-[18px]">
              <CardHeader
                title="Últimas llegadas"
                description="Pacientes registrados hoy en recepción"
                action={
                  <Link
                    href="/sigeco/recepcion"
                    className={cn(buttonVariants({ variant: "link", size: "sm" }))}
                  >
                    Ver recepción
                  </Link>
                }
              />
            </div>
            <RecordList>
              {receptionSummary.latestArrivals.map((visit) => (
                <RecordItem
                  key={visit.id}
                  href={`/sigeco/recepcion/visitas/${visit.id}`}
                  title={visit.patient.fullName}
                  status={<VisitStatusPill status={visit.status} />}
                >
                  <span className="tabular-nums">
                    {formatTime(visit.checkedInAt)} ·{" "}
                    {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}
                  </span>
                </RecordItem>
              ))}
              {receptionSummary.latestArrivals.length === 0 ? (
                <RecordListEmpty>{emptyArrivalsMessage}</RecordListEmpty>
              ) : null}
            </RecordList>
            <RecordTable>
              <Table caption="Pacientes registrados hoy en recepción">
                <thead>
                  <tr>
                    <Th>Paciente</Th>
                    <Th>Llegada</Th>
                    <Th>Área</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {receptionSummary.latestArrivals.map((visit) => (
                    <Tr key={visit.id}>
                      <Td className="font-semibold text-text">
                        <Link
                          href={`/sigeco/recepcion/visitas/${visit.id}`}
                          className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                        >
                          {visit.patient.fullName}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap tabular-nums">
                        {formatTime(visit.checkedInAt)}
                      </Td>
                      <Td>{visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}</Td>
                      <Td>
                        <VisitStatusPill status={visit.status} />
                      </Td>
                    </Tr>
                  ))}
                  {receptionSummary.latestArrivals.length === 0 ? (
                    <tr>
                      <Td className="py-8 text-center" colSpan={4}>
                        {emptyArrivalsMessage}
                      </Td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </RecordTable>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
