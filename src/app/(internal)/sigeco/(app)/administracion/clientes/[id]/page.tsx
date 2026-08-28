import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { canUse } from "@/features/modules/access";
import { formatMoney, saleStatusLabels } from "@/features/sales/labels";
import { formatDateTime } from "@/lib/dates";
import { getModuleAccessState } from "@/modules/database/queries/modules";
import { getWalkInClientById } from "@/modules/database/queries/patients";
import { getPatientSales } from "@/modules/database/queries/sales";
import { requirePermission } from "@/modules/permissions";

type ClientPageProps = {
  params: Promise<{ id: string }>;
};

const emptySalesMessage = (
  <>
    <span className="block font-semibold text-text">Todavía no le vendiste nada.</span>
    <span className="mt-1 block text-sm text-muted">
      Las ventas de este cliente van a aparecer acá.
    </span>
  </>
);

export default async function AdministrationClientPage({ params }: ClientPageProps) {
  const user = await requirePermission("patients_read", { module: "administracion" });
  const moduleAccess = await getModuleAccessState();
  const { id } = await params;
  const client = await getWalkInClientById(id);

  if (!client) notFound();

  const sales = await getPatientSales(client.id);
  // La ficha completa vive en Recepción: solo se ofrece cuando ese módulo está
  // lanzado y quien mira puede abrirla.
  const canCreateSale = canUse(user.role, moduleAccess, "sales_write");
  const canOpenFullRecord = canUse(user.role, moduleAccess, "patients_read", "recepcion");

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/administracion/clientes" label="Volver a clientes" />
      <PageHeader
        title={client.fullName}
        description={`Código ${client.internalCode}`}
        actionsClassName="w-full sm:w-auto"
        actions={
          <>
            {canCreateSale ? (
              <Link
                href={`/sigeco/administracion/ventas/nueva?cliente=${client.id}`}
                className={buttonVariants({ size: "sm" })}
              >
                Nueva venta
              </Link>
            ) : null}
            {canOpenFullRecord ? (
              <Link
                href={`/sigeco/recepcion/pacientes/${client.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Ver ficha completa
              </Link>
            ) : null}
          </>
        }
      />

      {client.mergedInto ? (
        <Card className="border-warning/30 bg-warning/10">
          <p className="text-sm text-text">
            Esta ficha se unió a{" "}
            <span className="font-semibold">{client.mergedInto.fullName}</span> (
            {client.mergedInto.internalCode}). Cobra sobre esa.
          </p>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Datos de contacto" description="Lo mínimo para cobrar y ubicar" />
        <dl className="grid gap-2">
          <InfoRow label="Teléfono" value={client.phone} />
          <InfoRow label="Teléfono alternativo" value={client.secondaryPhone ?? "—"} />
          <InfoRow label="Observación" value={client.generalObservations ?? "—"} />
          <InfoRow label="Registrado" value={formatDateTime(client.createdAt)} />
          <InfoRow
            label="Atenciones registradas"
            value={String(client._count.visits)}
          />
        </dl>
      </Card>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Ventas"
          description={`${client._count.sales} en total`}
        />
        <RecordList>
          {sales.map((sale) => (
            <RecordItem
              key={sale.id}
              href={`/sigeco/administracion/ventas/${sale.id}`}
              title={<span className="tabular-nums">{formatMoney(sale.totalCents)}</span>}
              status={<Chip>{saleStatusLabels[sale.status]}</Chip>}
            >
              <span className="tabular-nums">
                Pagado {formatMoney(sale.paidCents)} · Saldo {formatMoney(sale.balanceCents)}
              </span>
              <span className="block text-xs text-muted">{formatDateTime(sale.createdAt)}</span>
            </RecordItem>
          ))}
          {sales.length === 0 ? (
            <RecordListEmpty>{emptySalesMessage}</RecordListEmpty>
          ) : null}
        </RecordList>

        <RecordTable>
          <Table caption="Ventas de este cliente">
            <thead>
              <tr>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Pagado</Th>
                <Th className="text-right">Saldo</Th>
                <Th>Estado</Th>
                <Th>Fecha</Th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <Tr key={sale.id}>
                  <Td className="text-right font-semibold tabular-nums text-text">
                    <Link
                      href={`/sigeco/administracion/ventas/${sale.id}`}
                      className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                    >
                      {formatMoney(sale.totalCents)}
                    </Link>
                  </Td>
                  <Td className="text-right tabular-nums">{formatMoney(sale.paidCents)}</Td>
                  <Td className="text-right tabular-nums">{formatMoney(sale.balanceCents)}</Td>
                  <Td>
                    <Chip>{saleStatusLabels[sale.status]}</Chip>
                  </Td>
                  <Td className="whitespace-nowrap">{formatDateTime(sale.createdAt)}</Td>
                </Tr>
              ))}
              {sales.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={5}>
                    {emptySalesMessage}
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
