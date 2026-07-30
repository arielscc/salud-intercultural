import { notFound } from "next/navigation";
import { GeneratedDocumentPreview } from "@/components/internal/generated-documents/GeneratedDocumentPreview";
import { getGeneratedDocument } from "@/modules/generated-documents/service";
import { requirePermission } from "@/modules/permissions";

export default async function PrescriptionDocumentPage({
  params
}: {
  params: Promise<{ visitId: string; documentId: string }>;
}) {
  await requirePermission("clinical_read");
  const { visitId, documentId } = await params;
  const document = await getGeneratedDocument(documentId);
  if (
    !document ||
    document.kind !== "prescription" ||
    document.visitId !== visitId ||
    document.parsedSnapshot.kind !== "prescription"
  ) {
    notFound();
  }
  return (
    <GeneratedDocumentPreview
      id={document.id}
      snapshot={document.parsedSnapshot}
      backHref={`/sigeco/consultas/${encodeURIComponent(visitId)}#documentos-receta`}
      generatedBy={document.generatedBy.name ?? document.generatedBy.email}
    />
  );
}

