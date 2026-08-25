import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { Card } from "@/components/internal/ui/Card";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { WalkInClientForm } from "@/features/patients/components/WalkInClientForm";
import { requirePermission } from "@/modules/permissions";

export default async function NewWalkInClientPage() {
  await requirePermission("patients_create", { module: "administracion" });

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/administracion/clientes" label="Volver a clientes" />
      <PageHeader
        title="Registrar cliente"
        description="Lo mínimo para poder cobrar y volver a encontrarlo"
      />

      <Card className="max-w-xl">
        <p className="mb-4 text-sm text-muted">
          Con el nombre y el teléfono alcanza. El resto de la ficha —fecha de
          nacimiento, procedencia, antecedentes— la completa Recepción cuando la
          persona venga a una atención.
        </p>
        <WalkInClientForm />
      </Card>
    </div>
  );
}
