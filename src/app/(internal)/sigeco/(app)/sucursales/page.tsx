import { Building2, CircleDollarSign, Package, ReceiptText, Users } from "lucide-react";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { branchStatusLabels, canViewConsolidatedBranches } from "@/features/branches/policy";
import { formatMoney } from "@/features/sales/labels";
import { getBranchComparisonReport } from "@/modules/database/queries/branches";
import { requirePermission } from "@/modules/permissions";
import { redirect } from "next/navigation";

export default async function BranchesPage() {
  const user = await requirePermission("reports_read");
  if (!canViewConsolidatedBranches(user.role)) redirect("/sigeco");
  const report = await getBranchComparisonReport(user.role);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Sucursales"
        description="Comparación autorizada sin mezclar la operación diaria de cada sede."
      />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard icon={Users} label="Visitas" value={report.consolidated.visits} />
        <KpiCard icon={ReceiptText} label="Ventas" value={formatMoney(report.consolidated.salesCents)} />
        <KpiCard icon={CircleDollarSign} label="Cobrado" value={formatMoney(report.consolidated.paidCents)} />
        <KpiCard icon={Building2} label="Compras" value={formatMoney(report.consolidated.purchasesCents)} />
        <KpiCard icon={Package} label="Unidades en stock" value={report.consolidated.stockUnits} />
      </section>

      <Card className="overflow-hidden p-0">
        <CardHeader
          className="p-[18px] pb-3"
          title="Detalle por sucursal"
          description="Los datos sintéticos se muestran aparte y nunca se suman al consolidado real."
        />
        <div className="overflow-x-auto">
          <Table caption="Comparación de sucursales">
            <thead><tr><Th>Sucursal</Th><Th>Estado</Th><Th>Visitas reales</Th><Th>Pruebas</Th><Th>Ventas</Th><Th>Cobrado</Th><Th>Compras</Th><Th>Stock</Th><Th>Cajas abiertas</Th></tr></thead>
            <tbody>
              {report.rows.map((row) => (
                <Tr key={row.branch.code}>
                  <Td className="font-semibold text-text">{row.branch.name}<span className="block text-xs font-normal text-muted">{row.branch.department}</span></Td>
                  <Td><Chip tone={row.branch.status === "active" ? "success" : "warning"}>{branchStatusLabels[row.branch.status]}</Chip></Td>
                  <Td className="tabular-nums">{row.visits}</Td>
                  <Td className="tabular-nums">{row.syntheticVisits}</Td>
                  <Td className="tabular-nums">{formatMoney(row.salesCents)}</Td>
                  <Td className="tabular-nums">{formatMoney(row.paidCents)}</Td>
                  <Td className="tabular-nums">{formatMoney(row.purchasesCents)}</Td>
                  <Td className="tabular-nums">{row.stockUnits}</Td>
                  <Td className="tabular-nums">{row.openCashSessions}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
