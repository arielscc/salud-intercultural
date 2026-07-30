import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, GitMerge } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import {
  dismissPatientDuplicateAction,
  mergePatientDuplicateAction
} from "@/features/patient-duplicates/actions";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  patientGenderLabels,
  patientStatusLabels
} from "@/features/patients/labels";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { getPatientDuplicateCandidate } from "@/modules/database/queries/patient-duplicates";
import { requirePermission } from "@/modules/permissions";

const impactLabels: Record<string, string> = {
  convertedLeads: "Contactos previos",
  contacts: "Teléfonos alternativos",
  notes: "Notas",
  visits: "Visitas",
  clinicalConsultations: "Consultas médicas",
  prescriptions: "Recetas",
  clinicalEvolutions: "Evoluciones clínicas",
  clinicalNotes: "Notas clínicas",
  clinicalOrders: "Indicaciones",
  vitalSigns: "Registros de signos vitales",
  nursingApplications: "Aplicaciones de Enfermería",
  nursingNotes: "Notas de Enfermería",
  studies: "Estudios",
  sales: "Ventas",
  payments: "Pagos",
  deliveredProducts: "Productos entregados",
  cashMovements: "Movimientos de caja",
  followUpTasks: "Seguimientos",
  clinicalAttachments: "Adjuntos clínicos",
  consents: "Consentimientos",
  visitAttributions: "Atribuciones de llegada"
};

function shown(value: unknown) {
  if (value instanceof Date) return formatDate(value);
  if (value === null || value === undefined || value === "") return "Sin registro";
  return String(value);
}

function personFields(patient: {
  fullName: string;
  phone: string;
  birthDate: Date | null;
  gender: keyof typeof patientGenderLabels;
  city: string | null;
  department: string | null;
  country: string | null;
  allergies: string | null;
  relevantHistory: string | null;
  currentMedication: string | null;
  status: keyof typeof patientStatusLabels;
}) {
  return {
    "Nombre completo": patient.fullName,
    Teléfono: patient.phone,
    "Fecha de nacimiento": patient.birthDate,
    Género: patientGenderLabels[patient.gender],
    Ciudad: patient.city,
    Departamento: patient.department,
    País: patient.country,
    Alergias: patient.allergies,
    "Antecedentes relevantes": patient.relevantHistory,
    "Medicación actual": patient.currentMedication,
    Estado: patientStatusLabels[patient.status]
  };
}

function MergeChoice({
  candidateId,
  target,
  source
}: {
  candidateId: string;
  target: { id: string; internalCode: string; fullName: string };
  source: { id: string; internalCode: string; fullName: string };
}) {
  return (
    <form action={mergePatientDuplicateAction} className="grid gap-3">
      <input type="hidden" name="candidateId" value={candidateId} />
      <input type="hidden" name="targetPatientId" value={target.id} />
      <input type="hidden" name="sourcePatientId" value={source.id} />
      <p className="text-sm text-muted">
        Se conservará <strong className="text-text">{target.fullName}</strong>{" "}
        ({target.internalCode}). La ficha {source.internalCode} quedará como
        alias y redirigirá aquí.
      </p>
      <Field label={`Escribe ${target.internalCode} para confirmar`}>
        <input
          className={internalInputClassName}
          name="confirmation"
          autoComplete="off"
          required
        />
      </Field>
      <p className="-mt-2 text-xs text-muted">
        Esta confirmación evita fusionar la ficha equivocada.
      </p>
      <SubmitButton pendingLabel="Fusionando…">
        <GitMerge className="h-4 w-4" aria-hidden="true" />
        Conservar {target.internalCode} y fusionar
      </SubmitButton>
    </form>
  );
}

export default async function PatientDuplicateComparisonPage({
  params,
  searchParams
}: {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requirePermission("patient_duplicates_read");
  const [{ candidateId }, query] = await Promise.all([params, searchParams]);
  const candidate = await getPatientDuplicateCandidate(candidateId);
  if (!candidate) notFound();
  if (candidate.status === "merged" && candidate.merge) {
    redirect(
      `/sigeco/recepcion/pacientes/${candidate.merge.targetPatientId}`
    );
  }
  if (candidate.status === "dismissed") {
    redirect("/sigeco/recepcion/duplicados?aviso=descartado");
  }

  const canReview = roleHasPermission(user.role, "patient_duplicates_review");
  const canMerge = roleHasPermission(user.role, "patient_duplicates_merge");
  const firstFields = personFields(candidate.patientA);
  const secondFields = personFields(candidate.patientB);
  const impactKeys = Object.keys(impactLabels);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Comparar fichas"
        description="La comparación no modifica datos. La fusión requiere una confirmación aparte."
        actions={
          <Link
            href="/sigeco/recepcion/duplicados"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a la cola
          </Link>
        }
      />

      {query.error ? (
        <div className="rounded-[9px] bg-error/10 px-4 py-3 text-sm font-semibold text-error">
          La confirmación no coincide con la ficha que quieres conservar.
        </div>
      ) : null}

      <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
        <p className="flex items-center gap-2 font-semibold text-warning">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Coincidencia de {candidate.score} puntos
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {candidate.phoneMatch ? <Chip>Mismo teléfono</Chip> : null}
          {candidate.nameMatch ? <Chip>Mismo nombre</Chip> : null}
          {candidate.birthDateMatch ? (
            <Chip>Misma fecha de nacimiento</Chip>
          ) : null}
        </div>
      </div>

      <Card className="p-0">
        <CardHeader
          title="Datos registrados"
          description="Los valores diferentes requieren revisión humana; SIGECO no elige automáticamente."
          className="mb-0 p-[18px]"
        />
        <Table caption="Comparación de datos entre las dos fichas">
          <thead>
            <Tr>
              <Th>Dato</Th>
              <Th>{candidate.patientA.internalCode}</Th>
              <Th>{candidate.patientB.internalCode}</Th>
            </Tr>
          </thead>
          <tbody>
            {Object.keys(firstFields).map((label) => {
              const firstValue =
                firstFields[label as keyof typeof firstFields];
              const secondValue =
                secondFields[label as keyof typeof secondFields];
              const differs = shown(firstValue) !== shown(secondValue);
              return (
                <Tr key={label}>
                  <Td className="font-semibold text-text">{label}</Td>
                  <Td className={differs ? "bg-warning/5" : undefined}>
                    {shown(firstValue)}
                  </Td>
                  <Td className={differs ? "bg-warning/5" : undefined}>
                    {shown(secondValue)}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Card className="p-0">
        <CardHeader
          title="Simulación del impacto"
          description="Cantidad de registros que pasarían al expediente que decidas conservar."
          className="mb-0 p-[18px]"
        />
        <Table caption="Registros relacionados con cada ficha">
          <thead>
            <Tr>
              <Th>Tipo de registro</Th>
              <Th>{candidate.patientA.internalCode}</Th>
              <Th>{candidate.patientB.internalCode}</Th>
            </Tr>
          </thead>
          <tbody>
            {impactKeys.map((key) => (
              <Tr key={key}>
                <Td className="font-semibold text-text">
                  {impactLabels[key]}
                </Td>
                <Td>{candidate.patientA._count[key as keyof typeof candidate.patientA._count]}</Td>
                <Td>{candidate.patientB._count[key as keyof typeof candidate.patientB._count]}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="rounded-[9px] border border-border bg-surface p-4 lg:hidden">
        <p className="font-semibold text-text">
          La fusión se realiza desde una computadora
        </p>
        <p className="mt-1 text-sm text-muted">
          En el teléfono puedes revisar la comparación. Usa una pantalla de
          escritorio para elegir con seguridad qué ficha conservar.
        </p>
      </div>

      {canMerge ? (
        <section className="hidden gap-4 lg:grid lg:grid-cols-2">
          <Card>
            <CardHeader
              title={`Conservar ${candidate.patientA.internalCode}`}
              description={candidate.patientA.fullName}
            />
            <MergeChoice
              candidateId={candidate.id}
              target={candidate.patientA}
              source={candidate.patientB}
            />
          </Card>
          <Card>
            <CardHeader
              title={`Conservar ${candidate.patientB.internalCode}`}
              description={candidate.patientB.fullName}
            />
            <MergeChoice
              candidateId={candidate.id}
              target={candidate.patientB}
              source={candidate.patientA}
            />
          </Card>
        </section>
      ) : (
        <div className="hidden rounded-[9px] border border-border bg-surface p-4 text-sm text-muted lg:block">
          Solo el super administrador puede ejecutar la fusión. Recepción y
          Dirección pueden revisar la evidencia.
        </div>
      )}

      {canReview ? (
        <form action={dismissPatientDuplicateAction} className="flex justify-end">
          <input type="hidden" name="candidateId" value={candidate.id} />
          <SubmitButton variant="outline">
            No son la misma persona
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
