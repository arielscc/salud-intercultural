import { redirect } from "next/navigation";

// Fusion V3.7: el alta de pacientes ahora es el funnel de recepcion.
export default function LegacyNewPatientPage() {
  redirect("/sigeco/recepcion/nuevo");
}
