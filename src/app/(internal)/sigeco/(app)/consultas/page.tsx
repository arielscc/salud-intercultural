import Link from "next/link";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { Card } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
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
import { requirePermission } from "@/modules/permissions";

const emptyConsultationsMessage = (
  <>
    <span className="block font-semibold text-text">No hay pacientes en consulta.</span>
    <span className="mt-1 block text-sm text-muted">
      Recepción debe derivar una visita al área médica.
    </span>
  </>
);

export default async function ConsultationsPage() {
  await requirePermission("clinical_read");
  const visits = await getConsultationVisits({ pageSize: 30 });

  return (
    <div className="grid gap-4">
      <PageHeader title="Consultas" description="Atención médica" />

      <Card className="p-0">
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
          <Table>
            <thead>
              <tr>
                <Th>Paciente</Th>
                <Th>Teléfono</Th>
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
                  <Td className="tabular-nums">{visit.patient.phone}</Td>
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
