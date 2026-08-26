import { redirect } from "next/navigation";

// Fusion V3.7: la ficha de paciente vive dentro del modulo Recepcion.
export default async function LegacyPatientDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/sigeco/recepcion/pacientes/${id}`);
}
