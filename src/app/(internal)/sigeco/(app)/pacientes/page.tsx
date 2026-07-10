import { redirect } from "next/navigation";

// Fusion V3.7: Pacientes vive dentro del modulo Recepcion.
export default function LegacyPatientsPage() {
  redirect("/sigeco/recepcion?vista=pacientes");
}
