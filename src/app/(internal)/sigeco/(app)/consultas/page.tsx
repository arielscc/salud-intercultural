import Link from "next/link";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { routeAreaLabels } from "@/features/patients/labels";
import { getConsultationVisits } from "@/modules/database/queries/clinical-care";
import { requirePermission } from "@/modules/permissions";

export default async function ConsultationsPage() {
  await requirePermission("clinical_read");
  const visits = await getConsultationVisits({ pageSize: 30 });

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm font-semibold text-muted">Atención médica</p>
        <h2 className="font-sora text-2xl font-bold">Consultas</h2>
      </section>

      <section className="grid gap-3">
        {visits.map((visit) => (
          <Link
            key={visit.id}
            href={`/sigeco/consultas/${visit.id}`}
            className="focus-ring rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{visit.patient.fullName}</p>
                <p className="text-sm text-muted">{visit.patient.phone}</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"} ·{" "}
                  {visit.checkedInAt.toLocaleString("es-BO")}
                </p>
                {visit.clinicalConsultation ? (
                  <p className="mt-2 text-xs font-bold text-success">Consulta registrada</p>
                ) : null}
              </div>
              <VisitStatusPill status={visit.status} />
            </div>
          </Link>
        ))}
        {visits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
            <p className="font-bold">No hay pacientes en consulta.</p>
            <p className="mt-1 text-sm text-muted">
              Recepción debe derivar una visita al área médica.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
