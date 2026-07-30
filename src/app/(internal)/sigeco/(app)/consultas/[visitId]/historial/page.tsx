import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { Button } from "@/components/internal/ui/Button";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  clinicalCorrectionTypeLabels,
  clinicalRecordStatusLabels,
  clinicalRecordVersionKindLabels,
  clinicalSnapshotFieldLabels
} from "@/features/clinical-records/labels";
import { formatDateTime } from "@/lib/dates";
import { getClinicalConsultationVersionHistory } from "@/modules/database/queries/clinical-records";
import { requirePermission } from "@/modules/permissions";

type ClinicalHistoryPageProps = {
  params: Promise<{ visitId: string }>;
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

const snapshotFields = Object.keys(
  clinicalSnapshotFieldLabels
) as Array<keyof typeof clinicalSnapshotFieldLabels>;

function selectVersion(
  versions: Awaited<
    ReturnType<typeof getClinicalConsultationVersionHistory>
  > extends infer Consultation
    ? Consultation extends { versions: infer Versions }
      ? Versions
      : never
    : never,
  value: string | undefined,
  fallbackIndex: number
) {
  if (!Array.isArray(versions)) return undefined;
  const requested = Number(value);
  return (
    versions.find((version) => version.version === requested) ??
    versions[fallbackIndex] ??
    versions[0]
  );
}

function normalized(value: string | null | undefined) {
  return value?.trim() || "";
}

export default async function ClinicalHistoryPage({
  params,
  searchParams
}: ClinicalHistoryPageProps) {
  await requirePermission("clinical_read");
  const [{ visitId }, query] = await Promise.all([params, searchParams]);
  const consultation = await getClinicalConsultationVersionHistory(visitId);
  if (!consultation) notFound();

  const versions = [...consultation.versions].sort(
    (left, right) => right.version - left.version
  );
  const latest = selectVersion(versions, query.hasta, 0);
  const previous = selectVersion(versions, query.desde, 1);

  return (
    <div className="grid gap-4">
      <MobileBackLink
        href={`/sigeco/consultas/${visitId}`}
        label="Volver a la consulta"
      />
      <PageHeader
        title="Historial de la consulta"
        description="La versión anterior siempre permanece visible y puede compararse con la vigente."
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">
              {consultation.visit.patient.internalCode}
            </p>
            <h2 className="font-sora text-lg font-bold text-text">
              {consultation.visit.patient.fullName}
            </h2>
          </div>
          <Chip
            tone={consultation.status === "finalized" ? "success" : "warning"}
            dot
          >
            {clinicalRecordStatusLabels[consultation.status]}
          </Chip>
        </div>
        <p className="mt-3 text-sm text-muted">
          Versión vigente: {consultation.revision}
          {consultation.finalizedAt
            ? ` · Finalizada ${formatDateTime(consultation.finalizedAt)}`
            : ""}
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Comparar versiones"
          description="Los campos modificados aparecen resaltados."
        />
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1 text-sm font-semibold text-text">
            Versión anterior
            <select
              className="focus-ring min-h-11 rounded-[9px] border border-border bg-surface px-3 font-normal"
              name="desde"
              defaultValue={previous?.version}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.version}>
                  Versión {version.version} ·{" "}
                  {clinicalRecordVersionKindLabels[version.kind]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-text">
            Versión posterior
            <select
              className="focus-ring min-h-11 rounded-[9px] border border-border bg-surface px-3 font-normal"
              name="hasta"
              defaultValue={latest?.version}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.version}>
                  Versión {version.version} ·{" "}
                  {clinicalRecordVersionKindLabels[version.kind]}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="outline">
            Comparar
          </Button>
        </form>

        {previous && latest ? (
          <div className="mt-4 grid gap-2">
            <div className="hidden grid-cols-[minmax(9rem,0.45fr)_1fr_1fr] gap-2 px-3 text-xs font-semibold uppercase text-muted sm:grid">
              <span>Campo</span>
              <span>Versión {previous.version}</span>
              <span>Versión {latest.version}</span>
            </div>
            {snapshotFields.map((field) => {
              const before = previous[field];
              const after = latest[field];
              const changed = normalized(before) !== normalized(after);
              return (
                <div
                  key={field}
                  className={`grid gap-2 rounded-[9px] border p-3 text-sm sm:grid-cols-[minmax(9rem,0.45fr)_1fr_1fr] ${
                    changed
                      ? "border-warning/40 bg-warning/5"
                      : "border-border"
                  }`}
                >
                  <p className="font-semibold text-text">
                    {clinicalSnapshotFieldLabels[field]}
                    {changed ? (
                      <span className="ml-2 text-xs text-warning">
                        Modificado
                      </span>
                    ) : null}
                  </p>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted sm:hidden">
                      Versión {previous.version}
                    </p>
                    <p className="whitespace-pre-wrap text-text">
                      {before || "Sin registro"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted sm:hidden">
                      Versión {latest.version}
                    </p>
                    <p className="whitespace-pre-wrap text-text">
                      {after || "Sin registro"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Guarda la primera versión para habilitar la comparación.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Todas las versiones"
          description="Autor, fecha y motivo quedan unidos a cada cambio."
        />
        <div className="grid gap-2">
          {versions.map((version) => (
            <div
              key={version.id}
              className="rounded-[9px] border border-border bg-background px-3 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-text">
                  Versión {version.version} ·{" "}
                  {clinicalRecordVersionKindLabels[version.kind]}
                </p>
                <span className="text-xs tabular-nums text-muted">
                  {formatDateTime(version.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {version.author?.name ??
                  version.author?.email ??
                  "Autor histórico no disponible"}
              </p>
              {version.correctionType ? (
                <p className="mt-2 text-sm text-text">
                  <span className="font-semibold">
                    {clinicalCorrectionTypeLabels[version.correctionType]}:
                  </span>{" "}
                  {version.correctionReason}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Link
        href={`/sigeco/consultas/${visitId}`}
        className="focus-ring inline-flex min-h-11 items-center justify-center rounded-[9px] border border-border px-4 text-sm font-semibold text-text sm:w-fit"
      >
        Volver a la consulta
      </Link>
    </div>
  );
}
