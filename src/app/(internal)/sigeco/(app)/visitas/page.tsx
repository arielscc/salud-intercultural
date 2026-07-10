import Link from "next/link";
import { UserRoundPlus, UserRoundSearch } from "lucide-react";
import type { VisitStatus } from "@/generated/prisma/client";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { internalInputClassName } from "@/components/internal/Field";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { routeAreaLabels, visitStatusLabels } from "@/features/patients/labels";
import { getVisits } from "@/modules/database/queries/visits";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

const statusOptions = Object.entries(visitStatusLabels) as Array<[VisitStatus, string]>;

type VisitsPageProps = {
  searchParams: Promise<{ status?: VisitStatus }>;
};

export default async function VisitsPage({ searchParams }: VisitsPageProps) {
  await requirePermission("visits_read");
  const params = await searchParams;
  const visits = await getVisits({
    status: params.status,
    activeOnly: !params.status,
    pageSize: 30
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Visitas activas"
        description="Recepción"
        actions={
          <>
            <Link
              href="/sigeco/pacientes"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <UserRoundSearch className="h-4 w-4" aria-hidden="true" />
              Buscar paciente
            </Link>
            <Link href="/sigeco/recepcion/nuevo" className={cn(buttonVariants({ size: "sm" }))}>
              <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
              Registrar llegada
            </Link>
          </>
        }
      />

      <Card>
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <select className={internalInputClassName} name="status" defaultValue={params.status ?? ""}>
            <option value="">Solo activas</option>
            {statusOptions.map(([value, label]) => (
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
              <Th>Paciente</Th>
              <Th>Teléfono</Th>
              <Th>Llegada</Th>
              <Th>Área actual</Th>
              <Th>Tareas</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {visits.map((visit) => (
              <Tr key={visit.id}>
                <Td className="font-semibold text-text">
                  <Link
                    href={`/sigeco/visitas/${visit.id}`}
                    className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                  >
                    {visit.patient.fullName}
                  </Link>
                </Td>
                <Td className="tabular-nums">{visit.patient.phone}</Td>
                <Td className="tabular-nums">{visit.checkedInAt.toLocaleString("es-BO")}</Td>
                <Td>{visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}</Td>
                <Td className="tabular-nums">
                  {visit.workItems.length > 0 ? (
                    <Chip tone="primary">{visit.workItems.length} pendientes</Chip>
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
                  <span className="block font-semibold text-text">No hay visitas con ese filtro.</span>
                  <span className="mt-1 block text-sm text-muted">
                    Busca un paciente y registra su llegada.
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
