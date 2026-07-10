import { redirect } from "next/navigation";

// Fusion V3.7: Visitas vive dentro del modulo Recepcion (vista Hoy).
export default function LegacyVisitsPage() {
  redirect("/sigeco/recepcion");
}
