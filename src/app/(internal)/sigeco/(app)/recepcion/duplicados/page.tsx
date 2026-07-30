import Link from "next/link";
import { AlertTriangle, GitMerge, SearchCheck } from "lucide-react";
import { SubmitButton } from "@/components/internal/SubmitButton";
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
import { dismissPatientDuplicateAction } from "@/features/patient-duplicates/actions";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { getPatientDuplicateQueue } from "@/modules/database/queries/patient-duplicates";
import { requirePermission } from "@/modules/permissions";

function matchingReasons(candidate: {
  phoneMatch: boolean;
  nameMatch: boolean;
  birthDateMatch: boolean;
}) {
  return [
    candidate.phoneMatch ? "Mismo teléfono" : null,
    candidate.nameMatch ? "Mismo nombre" : null,
    candidate.birthDateMatch ? "Misma fecha de nacimiento" : null
  ].filter((reason): reason is string => Boolean(reason));
}

function recordCount(patient: { _count: Record<string, number> }) {
  return Object.values(patient._count).reduce(
    (total, count) => total + count,
    0
  );
}

export default async function PatientDuplicatesPage({
  searchParams
}: {
  searchParams: Promise<{ aviso?: string; error?: string }>;
}) {
  const user = await requirePermission("patient_duplicates_read");
  const [candidates, params] = await Promise.all([
    getPatientDuplicateQueue(),
    searchParams
  ]);
  const canReview = roleHasPermission(user.role, "patient_duplicates_review");
  const highConfidence = candidates.filter(
    (candidate) => candidate.score >= 70
  ).length;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Posibles pacientes duplicados"
        description="Revisa coincidencias antes de unir historias clínicas."
      />

      {params.aviso === "descartado" ? (
        <div className="rounded-[9px] bg-primary/10 px-4 py-3 text-sm font-semibold text-primary-dark">
          La coincidencia fue descartada. Ninguna ficha cambió.
        </div>
      ) : null}
      {params.error ? (
        <div className="rounded-[9px] bg-error/10 px-4 py-3 text-sm font-semibold text-error">
          No se pudo revisar esa coincidencia.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <KpiCard
          label="Pendientes de revisión"
          value={candidates.length}
          icon={SearchCheck}
          compactMobile
        />
        <KpiCard
          label="Coincidencia alta"
          value={highConfidence}
          icon={AlertTriangle}
          tone={highConfidence > 0 ? "error" : "muted"}
          compactMobile
        />
      </div>

      <Card className="p-0">
        <CardHeader
          title="Cola de revisión"
          description="Una coincidencia no significa automáticamente que sea la misma persona."
          className="mb-0 p-[18px]"
        />
        <RecordList>
          {candidates.length === 0 ? (
            <RecordListEmpty>
              <span className="font-semibold text-text">
                No hay coincidencias pendientes.
              </span>
            </RecordListEmpty>
          ) : (
            candidates.map((candidate) => {
              const href = `/sigeco/recepcion/duplicados/${candidate.id}`;
              return (
                <RecordItem
                  key={candidate.id}
                  href={href}
                  title={`${candidate.patientA.fullName} · ${candidate.patientB.fullName}`}
                  status={<Chip>{candidate.score} puntos</Chip>}
                >
                  <span>
                    {candidate.patientA.internalCode} ↔{" "}
                    {candidate.patientB.internalCode}
                  </span>
                  <span>{matchingReasons(candidate).join(" · ")}</span>
                  <span>
                    {recordCount(candidate.patientA)} y{" "}
                    {recordCount(candidate.patientB)} registros relacionados
                  </span>
                </RecordItem>
              );
            })
          )}
        </RecordList>

        <RecordTable>
          <Table caption="Posibles pacientes duplicados">
            <thead>
              <Tr>
                <Th>Fichas</Th>
                <Th>Coincidencias</Th>
                <Th>Impacto</Th>
                <Th>Detectado</Th>
                <Th className="text-right">Acciones</Th>
              </Tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <Tr key={candidate.id}>
                  <Td>
                    <p className="font-semibold text-text">
                      {candidate.patientA.fullName}
                    </p>
                    <p>{candidate.patientA.internalCode}</p>
                    <p className="mt-1 font-semibold text-text">
                      {candidate.patientB.fullName}
                    </p>
                    <p>{candidate.patientB.internalCode}</p>
                  </Td>
                  <Td>
                    <div className="flex max-w-xs flex-wrap gap-1.5">
                      {matchingReasons(candidate).map((reason) => (
                        <Chip key={reason}>{reason}</Chip>
                      ))}
                    </div>
                    <p className="mt-2 text-xs">{candidate.score} puntos</p>
                  </Td>
                  <Td>
                    {recordCount(candidate.patientA)} +{" "}
                    {recordCount(candidate.patientB)} registros
                  </Td>
                  <Td>{formatDate(candidate.lastDetectedAt)}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/sigeco/recepcion/duplicados/${candidate.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" })
                        )}
                      >
                        <GitMerge className="h-4 w-4" aria-hidden="true" />
                        Comparar
                      </Link>
                      {canReview ? (
                        <form action={dismissPatientDuplicateAction}>
                          <input
                            type="hidden"
                            name="candidateId"
                            value={candidate.id}
                          />
                          <SubmitButton variant="ghost" size="sm">
                            No son la misma persona
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </RecordTable>
      </Card>
    </div>
  );
}
