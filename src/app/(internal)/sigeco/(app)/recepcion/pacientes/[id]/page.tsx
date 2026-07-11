import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilLine, UserRoundPlus } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import { createFollowUpTaskAction } from "@/features/follow-ups/actions";
import { followUpStatusLabels } from "@/features/follow-ups/labels";
import { followUpContactPreferenceLabels } from "@/features/reception/labels";
import {
  patientCaptureSourceLabels,
  patientGenderLabels,
  routeAreaLabels
} from "@/features/patients/labels";
import { formatMoney, saleStatusLabels } from "@/features/sales/labels";
import { studyTypeLabels } from "@/features/studies/labels";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { getPatientById } from "@/modules/database/queries/patients";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

type PatientDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const user = await requirePermission("patients_read");
  const { id } = await params;
  const patient = await getPatientById(id);

  if (!patient) notFound();

  const nursingCount =
    patient.vitalSigns.length + patient.nursingApplications.length + patient.nursingNotes.length;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-4">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tabular-nums text-muted">{patient.internalCode}</p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">
                {patient.fullName}
              </h2>
            </div>
            {roleHasPermission(user.role, "patients_update") ? (
              <Link
                href={`/sigeco/recepcion/pacientes/${patient.id}/editar`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                Editar ficha
              </Link>
            ) : null}
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <InfoRow label="Teléfono" value={patient.phone} />
            {patient.secondaryPhone ? (
              <InfoRow label="Alternativo" value={patient.secondaryPhone} />
            ) : null}
            <InfoRow label="Género" value={patientGenderLabels[patient.gender]} />
            {patient.city ? <InfoRow label="Ciudad" value={patient.city} /> : null}
            <InfoRow label="Fuente" value={patientCaptureSourceLabels[patient.captureSource]} />
            <InfoRow
              label="Seguimiento"
              value={followUpContactPreferenceLabels[patient.followUpPreference]}
            />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Ficha permanente" />
          <dl className="grid gap-y-3 text-sm">
            <InfoRow label="Alergias" value={patient.allergies} wide />
            <InfoRow label="Antecedentes" value={patient.relevantHistory} wide />
            <InfoRow label="Observaciones" value={patient.generalObservations} wide />
          </dl>
        </Card>

        <Card className="p-0">
          <CardHeader className="mb-0 p-[18px] pb-3" title="Visitas" />
          <Table>
            <thead>
              <tr>
                <Th>Llegada</Th>
                <Th>Área actual</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {patient.visits.map((visit) => (
                <Tr key={visit.id}>
                  <Td className="font-semibold tabular-nums text-text">
                    <a
                      href={`/sigeco/recepcion/visitas/${visit.id}`}
                      className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                    >
                      {visit.checkedInAt.toLocaleString("es-BO")}
                    </a>
                  </Td>
                  <Td>{visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}</Td>
                  <Td>
                    <VisitStatusPill status={visit.status} />
                  </Td>
                </Tr>
              ))}
              {patient.visits.length === 0 ? (
                <tr>
                  <Td className="py-6 text-center" colSpan={3}>
                    Este paciente aún no tiene visitas registradas.
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Timeline de enfermería" />
          <div className="grid gap-0">
            {patient.vitalSigns.map((item) => (
              <TimelineItem
                key={item.id}
                title="Signos vitales"
                meta={item.recordedAt.toLocaleString("es-BO")}
                body={
                  <>
                    <span className="tabular-nums">
                      PA {item.systolicPressureMmHg ?? "-"}/{item.diastolicPressureMmHg ?? "-"} ·
                      Pulso {item.heartRateBpm ?? "-"} · Temp{" "}
                      {item.temperatureCelsius?.toString() ?? "-"}
                    </span>
                    {item.notes ? <span className="mt-1 block">{item.notes}</span> : null}
                  </>
                }
              />
            ))}
            {patient.nursingApplications.map((item) => (
              <TimelineItem
                key={item.id}
                title={item.medication}
                meta={item.appliedAt.toLocaleString("es-BO")}
                body={
                  <>
                    {item.quantity ?? "Sin cantidad"} · {item.route ?? "Sin vía"}
                    {item.notes ? <span className="mt-1 block">{item.notes}</span> : null}
                  </>
                }
              />
            ))}
            {patient.nursingNotes.map((item) => (
              <TimelineItem
                key={item.id}
                title="Nota de enfermería"
                meta={item.createdAt.toLocaleString("es-BO")}
                body={item.note}
              />
            ))}
            {nursingCount === 0 ? (
              <p className="py-2 text-sm text-muted">Sin registros de enfermería.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Estudios" />
          <div className="grid gap-0">
            {patient.studies.map((study) => (
              <TimelineItem
                key={study.id}
                title={study.title}
                meta={(study.performedAt ?? study.createdAt).toLocaleString("es-BO")}
                body={
                  <>
                    {studyTypeLabels[study.type]}
                    {study.resultSummary ? (
                      <span className="mt-1 block">{study.resultSummary}</span>
                    ) : null}
                  </>
                }
              />
            ))}
            {patient.studies.length === 0 ? (
              <p className="py-2 text-sm text-muted">Sin estudios registrados.</p>
            ) : null}
          </div>
        </Card>

        <Card className="p-0">
          <CardHeader className="mb-0 p-[18px] pb-3" title="Cronología administrativa" />
          <Table>
            <thead>
              <tr>
                <Th>Total</Th>
                <Th>Pagado</Th>
                <Th>Saldo</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {patient.sales.map((sale) => (
                <Tr key={sale.id}>
                  <Td className="font-semibold tabular-nums text-text">
                    <a
                      href={`/sigeco/administracion/ventas/${sale.id}`}
                      className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                    >
                      {formatMoney(sale.totalCents)}
                    </a>
                  </Td>
                  <Td className="tabular-nums">{formatMoney(sale.paidCents)}</Td>
                  <Td className="tabular-nums">{formatMoney(sale.balanceCents)}</Td>
                  <Td>{saleStatusLabels[sale.status]}</Td>
                </Tr>
              ))}
              {patient.sales.length === 0 ? (
                <tr>
                  <Td className="py-6 text-center" colSpan={4}>
                    Sin ventas ni cobros registrados.
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Historial de seguimiento" />
          <div className="grid gap-0">
            {patient.followUpTasks.map((task) => (
              <TimelineItem
                key={task.id}
                title={
                  <a
                    href={`/sigeco/seguimientos/${task.id}`}
                    className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                  >
                    {task.title}
                  </a>
                }
                meta={task.dueAt.toLocaleString("es-BO")}
                aside={
                  <span className="text-[11px] font-semibold text-muted">
                    {followUpStatusLabels[task.status]}
                  </span>
                }
                body={task.attempts[0]?.notes ?? undefined}
              />
            ))}
            {patient.followUpTasks.length === 0 ? (
              <p className="py-2 text-sm text-muted">Sin seguimientos registrados.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4">
        {roleHasPermission(user.role, "visits_create") ? (
          <Card>
            <CardHeader title="Registrar llegada" />
            <p className="mb-3 text-sm text-muted">
              Abre una visita con las preguntas de recepción; la ficha llega prellenada.
            </p>
            <Link
              href={`/sigeco/recepcion/nuevo?paciente=${patient.id}`}
              className={cn(buttonVariants(), "w-full")}
            >
              <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
              Registrar llegada
            </Link>
          </Card>
        ) : null}

        {roleHasPermission(user.role, "followups_write") ? (
          <Card>
            <CardHeader title="Crear seguimiento" />
            {patient.followUpPreference === "no_contact" ? (
              <div className="mb-3 rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
                <p className="flex items-center gap-1.5 font-semibold text-warning">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  El paciente pidió no recibir seguimiento
                </p>
                <p className="mt-1 text-muted">
                  Crea la tarea solo si es necesaria por razones clínicas y regístralo en las notas.
                </p>
              </div>
            ) : null}
            <form action={createFollowUpTaskAction} className="grid gap-3">
              <input type="hidden" name="patientId" value={patient.id} />
              <Field label="Título">
                <input
                  className={internalInputClassName}
                  name="title"
                  defaultValue="Seguimiento a paciente"
                  required
                />
              </Field>
              <Field label="Fecha y hora">
                <input
                  className={internalInputClassName}
                  name="dueAt"
                  type="datetime-local"
                  required
                />
              </Field>
              <Field label="Notas">
                <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
              </Field>
              <Button type="submit" variant="outline">
                Crear seguimiento
              </Button>
            </form>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
