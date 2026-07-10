import { IntakeFunnel } from "@/components/internal/reception/IntakeFunnel";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { requirePermission } from "@/modules/permissions";

type ReceptionIntakePageProps = {
  searchParams: Promise<{
    error?: string;
    duplicatePhone?: string;
  }>;
};

export default async function ReceptionIntakePage({ searchParams }: ReceptionIntakePageProps) {
  await requirePermission("visits_create");
  const params = await searchParams;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <PageHeader
        title="Registrar llegada"
        description="Recepción · Crea la ficha y abre la visita en un solo paso"
      />

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

      {params.duplicatePhone ? (
        <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            Posible paciente duplicado
          </p>
          <p className="mt-1 text-muted">
            Ya existe una ficha con el teléfono {params.duplicatePhone}. Búscala en el primer paso o
            vuelve a registrar para confirmar el duplicado.
          </p>
        </div>
      ) : null}

      <IntakeFunnel allowDuplicateFromServer={Boolean(params.duplicatePhone)} />
    </div>
  );
}
