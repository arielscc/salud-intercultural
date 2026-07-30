import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { createPurchaseReceiptAction } from "@/features/purchases/actions";
import { PurchaseError } from "@/features/purchases/components/PurchaseError";
import { PurchaseReceiptForm } from "@/features/purchases/components/PurchaseReceiptForm";
import { getCashPersonnel } from "@/modules/database/queries/cash";
import { getPurchaseById } from "@/modules/database/queries/purchases";
import { requirePermission } from "@/modules/permissions";

export default async function ReceivePurchasePage({
  params,
  searchParams
}: {
  params: Promise<{ purchaseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("purchase_receipts_write");
  const { purchaseId } = await params;
  const query = await searchParams;
  const [purchase, people] = await Promise.all([
    getPurchaseById(purchaseId),
    getCashPersonnel()
  ]);
  if (!purchase) notFound();
  if (!["confirmed", "partially_received"].includes(purchase.status)) {
    redirect(`/sigeco/compras/${purchase.id}?error=invalid-status`);
  }
  const pendingLines = purchase.lines.filter(
    (line) => line.receivedQuantity < line.orderedQuantity
  );

  return (
    <div className="grid gap-4">
      <MobileBackLink
        href={`/sigeco/compras/${purchase.id}`}
        label="Volver a la compra"
      />
      <PageHeader
        title="Recibir productos"
        description={`${purchase.purchaseNumber} · ${purchase.supplier.name}. Al confirmar aumentará el stock.`}
      />
      <PurchaseError code={query.error} />
      <PurchaseReceiptForm
        action={createPurchaseReceiptAction}
        purchaseId={purchase.id}
        lines={pendingLines}
        people={people}
        idempotencyKey={randomUUID()}
      />
    </div>
  );
}
