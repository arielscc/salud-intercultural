import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarClock,
  MessageCircle,
  PencilLine,
  Phone,
  UserRound,
  UserRoundPlus
} from "lucide-react";
import { ClinicalAttachmentsPanel } from "@/components/internal/clinical-attachments/ClinicalAttachmentsPanel";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { CollapsibleSection } from "@/components/internal/ui/CollapsibleSection";
import {
  DesktopSectionPanel,
  DesktopSectionTabs
} from "@/components/internal/ui/DesktopSectionTabs";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import {
  followUpPriorityLabels,
  followUpResultLabels,
  followUpStatusLabels,
  followUpTypeLabels
} from "@/features/follow-ups/labels";
import {
  patientCaptureSourceLabels,
  patientGenderLabels,
  routeAreaLabels
} from "@/features/patients/labels";
import { formatMoney, saleStatusLabels } from "@/features/sales/labels";
import { studyTypeLabels } from "@/features/studies/labels";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import { geographicOriginLabel } from "@/features/geography/origin";
import { visitAttributionSummary } from "@/features/attribution/catalog";
import { formatDateTime } from "@/lib/dates";
import { createDirectWhatsAppLink } from "@/lib/whatsapp";
import { getPatientById } from "@/modules/database/queries/patients";
import { getPatientServiceSessionPackages } from "@/modules/database/queries/service-sessions";
import {
  formatServiceSessionMoney,
  serviceSessionPricingModeLabels,
  serviceSessionStatusLabels
} from "@/features/service-sessions/labels";
import { getClinicalAttachmentsForPatient } from "@/modules/clinical-attachments/service";
import { requirePermission } from "@/modules/permissions";
import { Chip } from "@/components/internal/ui/Chip";
import { calculateAgeFromDate } from "@/lib/age";
import { cn } from "@/lib/cn";

type PatientDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    aviso?: string;
  }>;
};

function followUpStatusTone(
  status: string
): React.ComponentProps<typeof Chip>["tone"] {
  if (status === "pending" || status === "awaiting_payment") return "warning";
  if (
    status === "done" ||
    status === "improved" ||
    status === "wants_return" ||
    status === "requires_new_visit"
  ) {
    return "success";
  }
  if (status === "no_answer" || status === "not_improved" || status === "requires_doctor_call") {
    return "error";
  }
  return "neutral";
}

function followUpWhatsAppMessage(task: {
  title: string;
  notes: string | null;
  type: keyof typeof followUpTypeLabels;
}) {
  const subject = task.notes?.trim() || task.title.trim() || followUpTypeLabels[task.type];
  return `Hola, le escribimos de Salud Intercultural por su seguimiento: ${subject}`;
}

export default async function PatientDetailPage({
  params,
  searchParams
}: PatientDetailPageProps) {
  const user = await requirePermission("patients_read", { module: "recepcion" });
  const { id } = await params;
  const filters = await searchParams;
  const patient = await getPatientById(id);

  if (!patient) notFound();
  if (patient.mergedInto) {
    redirect(`/sigeco/recepcion/pacientes/${patient.mergedInto.id}`);
  }

  const canReadAttachments = roleHasPermission(user.role, "attachments_read");
  const attachments = canReadAttachments
    ? await getClinicalAttachmentsForPatient(patient.id)
    : [];
  const sessionPackages = await getPatientServiceSessionPackages(patient.id);
  const nursingCount =
    patient.vitalSigns.length + patient.nursingApplications.length + patient.nursingNotes.length;
  const age = calculateAgeFromDate(patient.birthDate);
  const patientOrigin = geographicOriginLabel(patient);
  const originalAttribution = [...patient.visits]
    .reverse()
    .find((visit) => visit.attribution)?.attribution;
  const initials = patient.fullName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const pendingFollowUps = patient.followUpTasks.filter((task) =>
    ["pending", "awaiting_payment"].includes(task.status)
  );
  const activeVisit = patient.visits.find((visit) =>
    isActiveVisitStatus(visit.status)
  );
  const activeArea = activeVisit?.route?.currentArea;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
      <MobileBackLink href="/sigeco/recepcion?vista=pacientes" label="Volver a Recepción" />
      {filters.aviso === "fichas-fusionadas" ? (
        <div className="rounded-[9px] bg-primary/10 px-4 py-3 text-sm xl:col-span-2">
          <p className="font-semibold text-primary-dark">
            Las fichas fueron fusionadas correctamente
          </p>
          <p className="mt-1 text-muted">
            La historia quedó reunida aquí. El código anterior sigue
            funcionando como alias y redirige a este expediente.
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 max-sm:contents">
        <Card className="max-sm:order-1 overflow-hidden border-primary/30 bg-surface p-0 shadow-sm">
          <div className="border-b border-primary/20 bg-primary/10 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-primary font-sora text-lg font-bold text-white shadow-sm"
                >
                  {initials || <UserRound className="h-6 w-6" />}
                </span>
                <div className="min-w-0">
                  <p className="inline-flex rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-dark shadow-sm">
                    {patient.internalCode}
                  </p>
                  <h2 className="mt-2 font-sora text-2xl font-bold leading-tight text-text sm:text-3xl">
                    {patient.fullName}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {age !== null ? <Chip>{age} años</Chip> : null}
                    {patient.gender !== "unknown" ? (
                      <Chip>{patientGenderLabels[patient.gender]}</Chip>
                    ) : null}
                    {patient.city ? <Chip>{patient.city}</Chip> : null}
                  </div>
                </div>
              </div>
              {roleHasPermission(user.role, "patients_update") ? (
                <Link
                  href={`/sigeco/recepcion/pacientes/${patient.id}/editar`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-surface")}
                >
                  <PencilLine className="h-4 w-4" aria-hidden="true" />
                  Editar ficha
                </Link>
              ) : null}
            </div>
          </div>
          {activeVisit && activeArea ? (
            <div className="border-b border-warning/25 bg-warning/10 px-4 py-3 text-sm sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-warning">
                    El paciente está en {routeAreaLabels[activeArea]}
                  </p>
                  <p className="mt-0.5 text-muted">
                    Visita activa desde {formatDateTime(activeVisit.checkedInAt)}.
                  </p>
                </div>
                <Link
                  href={`/sigeco/recepcion/visitas/${activeVisit.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Abrir visita
                </Link>
              </div>
            </div>
          ) : null}
          <div className="p-[18px]">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  Celular
                </dt>
                <dd className="m-0 mt-1">
                  <a
                    href={createDirectWhatsAppLink(patient.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex rounded-[7px] font-semibold tabular-nums text-primary-dark hover:underline"
                  >
                    {patient.phone}
                  </a>
                </dd>
              </div>
              {patient.secondaryPhone ? (
                <InfoRow label="Alternativo" value={patient.secondaryPhone} />
              ) : null}
              <InfoRow
                label="Procedencia habitual"
                value={patientOrigin || "Sin registrar"}
                wide
              />
              <InfoRow
                label="Cómo nos conoció"
                value={
                  originalAttribution
                    ? visitAttributionSummary(originalAttribution)
                    : patient.captureSources.length > 0
                    ? patient.captureSources
                        .map((source) => patientCaptureSourceLabels[source])
                        .join(" · ")
                    : patientCaptureSourceLabels[patient.captureSource]
                }
              />
              {patient.aliases.length > 0 ? (
                <InfoRow
                  label="Códigos anteriores"
                  value={patient.aliases
                    .map((alias) => alias.internalCode)
                    .join(" · ")}
                  wide
                />
              ) : null}
            </dl>
          </div>
        </Card>

        {patient.aliases.length > 0 ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Datos de fichas anteriores"
              description="Información conservada después de una fusión. No reemplaza los datos vigentes."
            />
            <div className="grid gap-3">
              {patient.aliases.map((alias) => (
                <section
                  key={alias.id}
                  className="rounded-[9px] border border-border bg-surface-soft/40 p-3"
                >
                  <p className="text-sm font-semibold text-text">
                    {alias.sourcePatient.internalCode} ·{" "}
                    {alias.sourcePatient.fullName}
                  </p>
                  <dl className="mt-2 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
                    <InfoRow
                      label="Teléfono anterior"
                      value={[
                        alias.sourcePatient.phone,
                        alias.sourcePatient.secondaryPhone
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                    <InfoRow
                      label="Alergias registradas"
                      value={alias.sourcePatient.allergies}
                    />
                    <InfoRow
                      label="Antecedentes"
                      value={alias.sourcePatient.relevantHistory}
                    />
                    <InfoRow
                      label="Medicación"
                      value={alias.sourcePatient.currentMedication}
                    />
                    {alias.sourcePatient.generalObservations ? (
                      <InfoRow
                        label="Observaciones"
                        value={alias.sourcePatient.generalObservations}
                        wide
                      />
                    ) : null}
                  </dl>
                </section>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="max-sm:order-4 xl:hidden">
          <CardHeader
            title="Ficha permanente"
            description="Antecedentes y datos clínicos que se conservan entre visitas."
          />
          <dl className="grid gap-y-3 text-sm">
            <InfoRow label="Alergias" value={patient.allergies} wide />
            <InfoRow label="Antecedentes" value={patient.relevantHistory} wide />
            <InfoRow label="Observaciones" value={patient.generalObservations} wide />
          </dl>
        </Card>

        <div className="hidden xl:block">
          <CollapsibleSection
            title="Ficha permanente"
            description="Alergias, antecedentes y observaciones"
            className="bg-surface"
          >
            <dl className="grid gap-y-3 text-sm">
              <InfoRow label="Alergias" value={patient.allergies} wide />
              <InfoRow label="Antecedentes" value={patient.relevantHistory} wide />
              <InfoRow label="Observaciones" value={patient.generalObservations} wide />
            </dl>
          </CollapsibleSection>
        </div>

        <DesktopSectionTabs
          label="Historiales del paciente"
          items={[
            { id: "historial-visitas", label: "Visitas", count: patient.visits.length },
            { id: "historial-enfermeria", label: "Enfermería", count: nursingCount },
            { id: "historial-estudios", label: "Estudios", count: patient.studies.length },
            { id: "historial-administracion", label: "Administración", count: patient.sales.length },
            {
              id: "historial-seguimiento",
              label: "Seguimiento",
              count: patient.followUpTasks.length
            }
          ]}
        >
          <DesktopSectionPanel id="historial-visitas">

        <Card className="max-sm:order-5 p-0">
          <CardHeader
            className="mb-0 p-[18px] pb-3"
            title="Historial de visitas"
            description="Atenciones registradas para este paciente, de la más reciente a la más antigua."
          />
          <RecordList>
            {patient.visits.map((visit) => (
              <RecordItem
                key={visit.id}
                href={`/sigeco/recepcion/visitas/${visit.id}`}
                title={<span className="tabular-nums">{formatDateTime(visit.checkedInAt)}</span>}
                status={<VisitStatusPill status={visit.status} />}
              >
                <span>{visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}</span>
                <span>
                  Procedencia:{" "}
                  {geographicOriginLabel({
                    city: visit.originCity,
                    department: visit.originDepartment,
                    country: visit.originCountry
                  }) || "Sin registrar"}
                </span>
                <span>
                  Cómo nos conoció: {visitAttributionSummary(visit.attribution)}
                </span>
              </RecordItem>
            ))}
            {patient.visits.length === 0 ? (
              <RecordListEmpty>
                <span className="text-sm text-muted">
                  Este paciente aún no tiene visitas registradas.
                </span>
              </RecordListEmpty>
            ) : null}
          </RecordList>
          <RecordTable>
            <Table caption="Historial de visitas del paciente">
              <thead>
                <tr>
                  <Th>Llegada</Th>
                  <Th>Procedencia de la visita</Th>
                  <Th>Cómo nos conoció</Th>
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
                        {formatDateTime(visit.checkedInAt)}
                      </a>
                    </Td>
                    <Td>
                      {geographicOriginLabel({
                        city: visit.originCity,
                        department: visit.originDepartment,
                        country: visit.originCountry
                      }) || "—"}
                    </Td>
                    <Td>{visitAttributionSummary(visit.attribution)}</Td>
                    <Td>{visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}</Td>
                    <Td>
                      <VisitStatusPill status={visit.status} />
                    </Td>
                  </Tr>
                ))}
                {patient.visits.length === 0 ? (
                  <tr>
                    <Td className="py-6 text-center" colSpan={5}>
                      Este paciente aún no tiene visitas registradas.
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </RecordTable>
        </Card>
          </DesktopSectionPanel>

          <DesktopSectionPanel id="historial-enfermeria">

        <Card className="max-sm:order-6">
          <CardHeader
            title="Historial de enfermería"
            description="Signos vitales, aplicaciones y notas registradas por Enfermería."
          />
          <div className="grid gap-0">
            {patient.vitalSigns.map((item) => (
              <TimelineItem
                key={item.id}
                title="Signos vitales"
                meta={formatDateTime(item.recordedAt)}
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
                meta={formatDateTime(item.appliedAt)}
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
                meta={formatDateTime(item.createdAt)}
                body={item.note}
              />
            ))}
            {nursingCount === 0 ? (
              <p className="py-2 text-sm text-muted">Sin registros de enfermería.</p>
            ) : null}
          </div>
        </Card>
          </DesktopSectionPanel>

          <DesktopSectionPanel id="historial-estudios">

        <Card className="max-sm:order-7">
          <CardHeader
            title="Estudios y resultados"
            description="Análisis solicitados, realizados y documentados para el paciente."
          />
          <div className="grid gap-0">
            {patient.studies.map((study) => (
              <TimelineItem
                key={study.id}
                title={study.title}
                meta={formatDateTime(study.performedAt ?? study.createdAt)}
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
          </DesktopSectionPanel>

          {sessionPackages.length > 0 ? (
            <DesktopSectionPanel id="historial-sesiones">
              <Card className="max-sm:order-8">
                <CardHeader
                  title="Sesiones de servicio"
                  description="Paquetes de suero/ozono: pagadas, usadas y restantes."
                />
                <div className="grid gap-2">
                  {sessionPackages.map((pkg) => {
                    const remaining = pkg.totalSessions - pkg.sessionsUsed;
                    return (
                      <div
                        key={pkg.id}
                        className="rounded-[9px] border border-border px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-text">{pkg.serviceName}</span>
                          <Chip tone={pkg.status === "active" ? "primary" : "neutral"}>
                            {serviceSessionStatusLabels[pkg.status]}
                          </Chip>
                        </div>
                        <p className="mt-1 tabular-nums text-muted">
                          {serviceSessionPricingModeLabels[pkg.pricingMode]} · Pagadas{" "}
                          {pkg.totalSessions} · Usadas {pkg.sessionsUsed} · Restantes {remaining} ·{" "}
                          {formatServiceSessionMoney(pkg.totalPaidCents)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </DesktopSectionPanel>
          ) : null}

          <DesktopSectionPanel id="historial-administracion">

        <Card className="max-sm:order-8 p-0">
          <CardHeader
            className="mb-0 p-[18px] pb-3"
            title="Historial de ventas y pagos"
            description="Movimientos administrativos asociados a las atenciones del paciente."
          />
          <RecordList>
            {patient.sales.map((sale) => (
              <RecordItem
                key={sale.id}
                href={`/sigeco/administracion/ventas/${sale.id}`}
                title={<span className="tabular-nums">{formatMoney(sale.totalCents)}</span>}
                status={<Chip>{saleStatusLabels[sale.status]}</Chip>}
              >
                <span className="tabular-nums">
                  Pagado {formatMoney(sale.paidCents)} · Saldo {formatMoney(sale.balanceCents)}
                </span>
              </RecordItem>
            ))}
            {patient.sales.length === 0 ? (
              <RecordListEmpty>
                <span className="text-sm text-muted">Sin ventas ni cobros registrados.</span>
              </RecordListEmpty>
            ) : null}
          </RecordList>
          <RecordTable>
            <Table caption="Historial de ventas y pagos del paciente">
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
          </RecordTable>
        </Card>
          </DesktopSectionPanel>

          <DesktopSectionPanel id="historial-seguimiento">

        <Card className="max-sm:order-9">
          <CardHeader
            title="Historial de seguimiento"
            description="Contactos programados, intentos realizados y resultados obtenidos."
          />
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
                meta={`${followUpTypeLabels[task.type]} · ${formatDateTime(task.dueAt)}`}
                aside={followUpStatusLabels[task.status]}
                body={
                  [
                    task.assignedTo?.name
                      ? `Responsable: ${task.assignedTo.name}`
                      : "Sin responsable asignado",
                    task.result
                      ? `Resultado: ${followUpResultLabels[task.result]}`
                      : null,
                    task.attempts[0]?.notes
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
              />
            ))}
            {patient.followUpTasks.length === 0 ? (
              <p className="py-2 text-sm text-muted">Sin seguimientos registrados.</p>
            ) : null}
          </div>
        </Card>
          </DesktopSectionPanel>
        </DesktopSectionTabs>

        {canReadAttachments ? (
          <ClinicalAttachmentsPanel
            patientId={patient.id}
            attachments={attachments.map((attachment) => ({
              id: attachment.id,
              label: attachment.label,
              contentType: attachment.contentType,
              sizeBytes: attachment.sizeBytes,
              scanStatus: attachment.scanStatus,
              createdAt: attachment.createdAt.toISOString(),
              visitId: attachment.visitId,
              studyId: attachment.studyId,
              uploadedByName: attachment.uploadedBy?.name ?? null,
              visitLabel: attachment.visit
                ? `Visita del ${formatDateTime(attachment.visit.checkedInAt)}`
                : null,
              studyTitle: attachment.study?.title ?? null
            }))}
            visits={patient.visits.map((visit) => ({
              id: visit.id,
              label: formatDateTime(visit.checkedInAt)
            }))}
            studies={patient.studies.map((study) => ({
              id: study.id,
              label: study.title
            }))}
            canWrite={roleHasPermission(user.role, "attachments_write")}
            canDelete={roleHasPermission(user.role, "attachments_delete")}
          />
        ) : null}
      </div>

      <div className="grid gap-4 max-sm:contents xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        {roleHasPermission(user.role, "visits_create") ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Registrar nueva llegada"
              description="Inicia una visita activa para este paciente."
            />
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

        {roleHasPermission(user.role, "followups_read") ? (
          <Card className="max-sm:order-3">
            <CardHeader
              title="Seguimientos programados"
              description="Recepción realiza los contactos creados por el área responsable."
            />
            <div className="grid gap-2">
              {pendingFollowUps.map((task) => (
                <section
                  key={task.id}
                  className="rounded-[9px] border border-border bg-surface-soft/35 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">
                        {task.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-muted">
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDateTime(task.dueAt)}
                      </p>
                    </div>
                    <Chip tone={followUpStatusTone(task.status)} dot>
                      {followUpStatusLabels[task.status]}
                    </Chip>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip tone="primary">{followUpTypeLabels[task.type]}</Chip>
                    <Chip>
                      Prioridad {followUpPriorityLabels[task.priority].toLocaleLowerCase("es-BO")}
                    </Chip>
                  </div>
                  {task.notes ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted">{task.notes}</p>
                  ) : null}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <a
                      href={createDirectWhatsAppLink(patient.phone, followUpWhatsAppMessage(task))}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ size: "sm" }), "w-full")}
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      WhatsApp
                    </a>
                    <Link
                      href={`/sigeco/seguimientos/${task.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
                    >
                      Registrar contacto
                    </Link>
                  </div>
                </section>
              ))}
              {pendingFollowUps.length === 0 ? (
                <p className="rounded-[9px] border border-border bg-surface-soft/35 px-3 py-3 text-sm text-muted">
                  No hay seguimientos pendientes para realizar.
                </p>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
