import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { internalInputClassName } from "@/components/internal/Field";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Pagination } from "@/components/internal/ui/Pagination";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { canUse } from "@/features/modules/access";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { parsePage } from "@/modules/database/pagination";
import { countPatients, getPatients } from "@/modules/database/queries/patients";
import { getModuleAccessState } from "@/modules/database/queries/modules";
import { requirePermission } from "@/modules/permissions";

type ClientsPageProps = {
  searchParams: Promise<{ buscar?: string; page?: string }>;
};

const emptyMessage = (
  <>
    <span className="block font-semibold text-text">No hay clientes con esa búsqueda.</span>
    <span className="mt-1 block text-sm text-muted">
      Regístralo con su nombre y teléfono para poder cobrarle.
    </span>
  </>
);

export default async function AdministrationClientsPage({ searchParams }: ClientsPageProps) {
  const user = await requirePermission("patients_read", { module: "administracion" });
  const moduleAccess = await getModuleAccessState();
  const params = await searchParams;
  const search = params.buscar?.trim() ?? "";
  const page = parsePage(params.page);
  const pageSize = 30;

  const [patients, total] = await Promise.all([
    getPatients({ search: search || undefined, page, pageSize }),
    countPatients({ search: search || undefined })
  ]);
  const canRegister = canUse(user.role, moduleAccess, "patients_create", "administracion");

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/administracion" label="Volver a Caja" />
      <PageHeader
        title="Clientes"
        description="Personas a las que Administración puede cobrar"
        actionsClassName="w-full sm:w-auto"
        actions={
          canRegister ? (
            <Link
              href="/sigeco/administracion/clientes/nuevo"
              className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}
            >
              <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
              Registrar cliente
            </Link>
          ) : undefined
        }
      />

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Buscar"
          description="Por nombre, teléfono o código interno"
        />
        <form className="flex flex-wrap gap-2 border-t border-border p-[18px]">
          <input
            name="buscar"
            defaultValue={search}
            placeholder="Nombre, teléfono o código"
            className={cn(internalInputClassName, "min-w-0 flex-1")}
          />
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            Buscar
          </button>
        </form>
      </Card>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title={search ? "Resultados" : "Últimos clientes"}
          description={`${total} ficha${total === 1 ? "" : "s"}`}
        />

        <RecordList>
          {patients.map((patient) => (
            <RecordItem
              key={patient.id}
              href={`/sigeco/administracion/clientes/${patient.id}`}
              title={patient.fullName}
            >
              <span className="tabular-nums">
                {patient.phone} · {patient.internalCode}
              </span>
            </RecordItem>
          ))}
          {patients.length === 0 ? <RecordListEmpty>{emptyMessage}</RecordListEmpty> : null}
        </RecordList>

        <RecordTable>
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Teléfono</Th>
                <Th>Código</Th>
                <Th>Registrado</Th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <Tr key={patient.id}>
                  <Td className="font-semibold text-text">
                    <Link
                      href={`/sigeco/administracion/clientes/${patient.id}`}
                      className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                    >
                      {patient.fullName}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">{patient.phone}</Td>
                  <Td className="whitespace-nowrap tabular-nums">{patient.internalCode}</Td>
                  <Td className="whitespace-nowrap">{formatDateTime(patient.createdAt)}</Td>
                </Tr>
              ))}
              {patients.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={4}>
                    {emptyMessage}
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </RecordTable>
      </Card>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        pathname="/sigeco/administracion/clientes"
        searchParams={search ? { buscar: search } : {}}
      />
    </div>
  );
}
