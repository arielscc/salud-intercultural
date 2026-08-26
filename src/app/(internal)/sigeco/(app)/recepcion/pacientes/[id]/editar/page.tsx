import { notFound, redirect } from "next/navigation";
import { PatientEditForm } from "@/components/internal/reception/PatientEditForm";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { toDateOnlyString } from "@/lib/dates";
import { getReceptionPatientById } from "@/modules/database/queries/reception";
import { requirePermission } from "@/modules/permissions";

type PatientEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; duplicate?: string }>;
};

export default async function PatientEditPage({ params, searchParams }: PatientEditPageProps) {
  await requirePermission("patients_update", { module: "recepcion" });
  const [{ id }, { error, duplicate }] = await Promise.all([
    params,
    searchParams
  ]);
  const patient = await getReceptionPatientById(id);

  if (!patient) notFound();
  if (patient.mergedIntoId) {
    redirect(`/sigeco/recepcion/pacientes/${patient.mergedIntoId}/editar`);
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4 lg:max-w-5xl">
      <PageHeader
        title="Editar ficha"
        description={`${patient.internalCode} · ${patient.fullName}`}
      />

      {error === "invalid" ? (
        <div className="rounded-[9px] bg-error/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-error">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            No se pudieron guardar los cambios
          </p>
          <p className="mt-1 text-muted">
            Revisa el nombre, el teléfono y la procedencia geográfica e inténtalo de nuevo.
          </p>
        </div>
      ) : null}

      {duplicate === "true" ? (
        <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
          <p className="font-semibold text-warning">
            Los nuevos datos coinciden con otra ficha
          </p>
          <p className="mt-1 text-muted">
            Revisa la cola de duplicados antes de continuar. Si verificaste que
            son personas distintas, puedes guardar de todos modos y la
            coincidencia quedará disponible para revisión.
          </p>
        </div>
      ) : null}

      <PatientEditForm
        allowDuplicate={duplicate === "true"}
        patient={{
          ...patient,
          birthDate: toDateOnlyString(patient.birthDate)
        }}
      />
    </div>
  );
}
