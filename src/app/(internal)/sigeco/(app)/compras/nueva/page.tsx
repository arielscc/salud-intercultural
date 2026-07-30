import { randomUUID } from "node:crypto";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { PurchaseDraftForm } from "@/features/purchases/components/PurchaseDraftForm";
import { PurchaseError } from "@/features/purchases/components/PurchaseError";
import { todayDateOnly } from "@/lib/dates";
import { getActiveSuppliers } from "@/modules/database/queries/inventory";
import {
  getPendingUrgentPurchaseExpenses,
  getPurchaseFormItems
} from "@/modules/database/queries/purchases";
import { requirePermission } from "@/modules/permissions";
import { createPurchaseAction } from "@/features/purchases/actions";

export default async function NewPurchasePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("purchases_write");
  const query = await searchParams;
  const [suppliers, items, urgentExpenses] = await Promise.all([
    getActiveSuppliers(),
    getPurchaseFormItems(),
    getPendingUrgentPurchaseExpenses()
  ]);

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/compras" label="Volver a compras" />
      <PageHeader
        title="Nueva compra"
        description="Primero registra lo pedido. El stock aumentará únicamente cuando recibas los productos."
      />
      <PurchaseError code={query.error} />
      {suppliers.length > 0 && items.length > 0 ? (
        <PurchaseDraftForm
          action={createPurchaseAction}
          suppliers={suppliers}
          items={items}
          urgentExpenses={urgentExpenses}
          idempotencyKey={randomUUID()}
          defaultDate={todayDateOnly()}
        />
      ) : (
        <div className="rounded-[9px] border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          Necesitas al menos un proveedor y un producto activos antes de registrar una compra.
        </div>
      )}
    </div>
  );
}
