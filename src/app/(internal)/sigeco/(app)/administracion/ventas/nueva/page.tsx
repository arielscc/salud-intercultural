import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRoundPlus } from "lucide-react";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { internalInputClassName } from "@/components/internal/Field";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { AdministrationChargeDialog } from "@/features/sales/components/AdministrationChargeDialog";
import { createSaleOrderAction } from "@/features/sales/actions";
import { canUse } from "@/features/modules/access";
import { getBranchContext } from "@/features/branches/context";
import { cn } from "@/lib/cn";
import { getModuleAccessState } from "@/modules/database/queries/modules";
import { getPatients, getWalkInClientById } from "@/modules/database/queries/patients";
import { getInventoryItems } from "@/modules/database/queries/inventory";
import { getActiveServiceCatalogItems } from "@/modules/database/queries/service-catalog";
import { requirePermission } from "@/modules/permissions";

type NewSalePageProps = {
  searchParams: Promise<{ cliente?: string; buscar?: string; error?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-sale": "Revisa los conceptos, las cantidades y los precios.",
  "insufficient-stock": "No hay stock suficiente para uno de los productos.",
  "unavailable-product": "Uno de los productos ya no está disponible para la venta."
};

const emptySearchMessage = (
  <>
    <span className="block font-semibold text-text">No hay clientes con esa búsqueda.</span>
    <span className="mt-1 block text-sm text-muted">
      Regístralo con su nombre y teléfono para poder cobrarle.
    </span>
  </>
);

export default async function NewSalePage({ searchParams }: NewSalePageProps) {
  const user = await requirePermission("sales_write");
  const moduleAccess = await getModuleAccessState();
  const params = await searchParams;
  const error = params.error ? errorMessages[params.error] : null;
  const canRegisterClient = canUse(
    user.role,
    moduleAccess,
    "patients_create",
    "administracion"
  );

  // Paso 1: elegir a quién se le vende.
  if (!params.cliente) {
    const search = params.buscar?.trim() ?? "";
    const patients = await getPatients({ search: search || undefined, pageSize: 20 });

    return (
      <div className="grid gap-4">
        <MobileBackLink href="/sigeco/administracion" label="Volver a Caja" />
        <PageHeader
          title="Nueva venta"
          description="Primero, ¿a quién se le vende?"
          actionsClassName="w-full sm:w-auto"
          actions={
            canRegisterClient ? (
              <Link
                href="/sigeco/administracion/clientes/nuevo"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full sm:w-auto")}
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
            title="Buscar cliente"
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

          <RecordList>
            {patients.map((patient) => (
              <RecordItem
                key={patient.id}
                href={`/sigeco/administracion/ventas/nueva?cliente=${patient.id}`}
                title={patient.fullName}
              >
                <span className="tabular-nums">
                  {patient.phone} · {patient.internalCode}
                </span>
              </RecordItem>
            ))}
            {patients.length === 0 ? (
              <RecordListEmpty>{emptySearchMessage}</RecordListEmpty>
            ) : null}
          </RecordList>

          <RecordTable>
            <Table caption="Clientes que coinciden con la búsqueda">
              <thead>
                <tr>
                  <Th>Cliente</Th>
                  <Th>Teléfono</Th>
                  <Th>Código</Th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <Tr key={patient.id}>
                    <Td className="font-semibold text-text">
                      <Link
                        href={`/sigeco/administracion/ventas/nueva?cliente=${patient.id}`}
                        className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                      >
                        {patient.fullName}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap tabular-nums">{patient.phone}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{patient.internalCode}</Td>
                  </Tr>
                ))}
                {patients.length === 0 ? (
                  <tr>
                    <Td className="py-8 text-center" colSpan={3}>
                      {emptySearchMessage}
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </RecordTable>
        </Card>
      </div>
    );
  }

  // Paso 2: armar la venta para ese cliente.
  const client = await getWalkInClientById(params.cliente);
  if (!client) notFound();

  const { activeBranch } = await getBranchContext(user);
  const [catalogItems, inventoryItems] = await Promise.all([
    getActiveServiceCatalogItems(),
    getInventoryItems({
      pageSize: 100,
      status: "active",
      usage: "sale",
      branchCode: activeBranch.code
    })
  ]);

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/administracion/ventas/nueva" label="Cambiar de cliente" />
      <PageHeader
        title="Nueva venta"
        description={`${client.fullName} · ${client.internalCode}`}
      />

      {error ? (
        <Card className="border-error/30 bg-error/5">
          <p className="text-sm font-semibold text-error">{error}</p>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Conceptos de la venta"
          description="Servicios, tratamientos y productos del catálogo vigente."
        />
        <p className="mb-4 text-sm text-muted">
          La venta queda pendiente de cobro. El pago se registra en Caja desde el
          detalle de la venta, que también emite el recibo.
        </p>
        <AdministrationChargeDialog
          action={createSaleOrderAction}
          patientId={client.id}
          visitId=""
          workItemId=""
          catalogItems={catalogItems.map((item) => ({
            id: item.id,
            name: item.name,
            kind: item.kind as "service" | "treatment",
            basePriceCents: item.basePriceCents
          }))}
          inventoryItems={inventoryItems.map((item) => ({
            id: item.id,
            name: item.name,
            salePriceCents: item.salePriceCents
          }))}
        />
      </Card>

      <Card>
        <CardHeader title="Cliente" description="A quién se le está vendiendo" />
        <p className="text-sm text-text">{client.fullName}</p>
        <p className="text-sm tabular-nums text-muted">{client.phone}</p>
        <Link
          href={`/sigeco/administracion/clientes/${client.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
        >
          Ver su ficha y sus ventas
        </Link>
      </Card>
    </div>
  );
}
