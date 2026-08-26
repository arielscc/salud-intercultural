import { notFound } from "next/navigation";
import { GeneratedDocumentPreview } from "@/components/internal/generated-documents/GeneratedDocumentPreview";
import { getGeneratedDocument } from "@/modules/generated-documents/service";
import { requirePermission } from "@/modules/permissions";

export default async function InternalReceiptDocumentPage({
  params
}: {
  params: Promise<{ saleId: string; documentId: string }>;
}) {
  await requirePermission("sales_read");
  const { saleId, documentId } = await params;
  const document = await getGeneratedDocument(documentId);
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

