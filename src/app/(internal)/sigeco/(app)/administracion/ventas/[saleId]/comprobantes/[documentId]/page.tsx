import { notFound } from "next/navigation";
import { GeneratedDocumentPreview } from "@/components/internal/generated-documents/GeneratedDocumentPreview";
import { getGeneratedDocument } from "@/modules/generated-documents/service";
import { requirePermission } from "@/modules/permissions";
import { getBranchContext } from "@/features/branches/context";

export default async function InternalReceiptDocumentPage({
  params
}: {
  params: Promise<{ saleId: string; documentId: string }>;
}) {
  const user = await requirePermission("sales_read");
  const { activeBranch } = await getBranchContext(user);
  const { saleId, documentId } = await params;
  const document = await getGeneratedDocument(documentId, activeBranch.code);
  if (
    !document ||
    document.kind !== "internal_sale_receipt" ||
    document.saleId !== saleId ||
    document.parsedSnapshot.kind !== "internal_sale_receipt"
  ) {
    notFound();
  }
  return (
    <GeneratedDocumentPreview
      id={document.id}
      snapshot={document.parsedSnapshot}
      backHref={`/sigeco/administracion/ventas/${encodeURIComponent(saleId)}#comprobantes-versionados`}
      generatedBy={document.generatedBy.name ?? document.generatedBy.email}
    />
  );
}
