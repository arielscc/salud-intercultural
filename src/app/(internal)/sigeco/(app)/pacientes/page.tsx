import Link from "next/link";
import { Plus } from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card } from "@/components/internal/ui/Card";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { getPatients } from "@/modules/database/queries/patients";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

type PatientsPageProps = {
  searchParams: Promise<{ search?: string }>;
};

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  await requirePermission("patients_read");
  const params = await searchParams;
  const patients = await getPatients({ search: params.search, pageSize: 30 });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Pacientes"
        description="Recepción"
        actions={
          <Link href="/sigeco/pacientes/nuevo" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo paciente
          </Link>
        }
      />

      <Card>
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className={internalInputClassName}
            type="search"
            name="search"
            placeholder="Buscar por nombre, teléfono, código o ciudad"
            defaultValue={params.search}
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <Table>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Código</Th>
              <Th>Teléfono</Th>
              <Th>Ciudad</Th>
              <Th>Visitas</Th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <Tr key={patient.id}>
                <Td className="font-semibold text-text">
                  <Link
                    href={`/sigeco/pacientes/${patient.id}`}
                    className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                  >
                    {patient.fullName}
                  </Link>
                </Td>
                <Td className="tabular-nums">{patient.internalCode}</Td>
                <Td className="tabular-nums">{patient.phone}</Td>
                <Td>{patient.city || "—"}</Td>
                <Td className="tabular-nums">{patient._count.visits}</Td>
              </Tr>
            ))}
            {patients.length === 0 ? (
              <tr>
                <Td className="py-8 text-center" colSpan={5}>
                  <span className="block font-semibold text-text">
                    No hay pacientes con esa búsqueda.
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    Registra un paciente nuevo desde recepción.
                  </span>
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
