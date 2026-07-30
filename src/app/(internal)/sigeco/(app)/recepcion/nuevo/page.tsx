import { IntakeFunnel } from "@/components/internal/reception/IntakeFunnel";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { toDateOnlyString } from "@/lib/dates";
import { getReceptionPatientById } from "@/modules/database/queries/reception";
import { getReceptionCaptureSources } from "@/modules/database/queries/attribution";
import { requirePermission } from "@/modules/permissions";

type ReceptionIntakePageProps = {
  searchParams: Promise<{
    error?: string;
    duplicate?: string;
    paciente?: string;
  }>;
};

export default async function ReceptionIntakePage({ searchParams }: ReceptionIntakePageProps) {
  await requirePermission("visits_create");
  const params = await searchParams;
  const [patient, captureSourceOptions] = await Promise.all([
    params.paciente ? getReceptionPatientById(params.paciente) : null,
    getReceptionCaptureSources()
  ]);
  const initialPatient = patient
    ? { ...patient, birthDate: toDateOnlyString(patient.birthDate) }
    : undefined;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4 lg:max-w-4xl">
      <PageHeader
        title="Registrar llegada"
        description="Recepción · Completa el funnel para crear la ficha y abrir la visita"
      />

      {params.error === "incomplete-funnel" ? (
        <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
          <p className="font-semibold text-warning">El registro todavía no estaba completo</p>
          <p className="mt-1 text-muted">
            La persona no fue creada como paciente. Completa todos los pasos y confirma al final.
          </p>
        </div>
      ) : null}

      {params.error === "invalid" ? (
        <div className="rounded-[9px] bg-error/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-error">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            No se pudo registrar
          </p>
          <p className="mt-1 text-muted">
            Revisa el nombre, el teléfono y el motivo de la visita e inténtalo de nuevo.
          </p>
        </div>
      ) : null}

      {params.error === "invalid-attribution" ? (
        <div className="rounded-[9px] bg-error/10 px-4 py-3 text-sm">
          <p className="font-semibold text-error">
            El código de formulario o campaña no es válido
          </p>
          <p className="mt-1 text-muted">
            Comprueba el código registrado en el mensaje, formulario o enlace.
            No selecciones manualmente una cuenta de TikTok o un tipo de
            publicidad.
          </p>
        </div>
      ) : null}

      {params.duplicate === "true" ? (
        <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            Posible paciente duplicado
          </p>
          <p className="mt-1 text-muted">
            Ya existe una ficha con el mismo teléfono normalizado o con el
            mismo nombre y fecha de nacimiento. Búscala en el primer paso antes
            de crear otra.
          </p>
        </div>
      ) : null}

      <IntakeFunnel
        allowDuplicateFromServer={params.duplicate === "true"}
        initialPatient={initialPatient}
        captureSourceOptions={captureSourceOptions}
      />
    </div>
  );
}
