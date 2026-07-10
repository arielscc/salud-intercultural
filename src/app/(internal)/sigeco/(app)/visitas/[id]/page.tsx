import { redirect } from "next/navigation";

// Fusion V3.7: el detalle de visita vive dentro del modulo Recepcion.
export default async function LegacyVisitDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/sigeco/recepcion/visitas/${id}`);
}
