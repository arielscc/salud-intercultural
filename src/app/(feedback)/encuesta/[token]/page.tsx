import type { Metadata } from "next";
import { PatientFeedbackForm } from "@/components/public/PatientFeedbackForm";
import { getPublicPatientFeedbackForm } from "@/modules/patient-feedback/public";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Cuéntenos sobre su atención | Salud Intercultural",
  description: "Encuesta privada sobre la atención recibida.",
  robots: { index: false, follow: false, noarchive: true }
};

export default async function PatientFeedbackPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const form = /^[A-Za-z0-9_-]{40,100}$/.test(token)
    ? await getPublicPatientFeedbackForm(token)
    : { state: "invalid" as const };

  return (
    <main id="contenido-principal" className="min-h-screen bg-background px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-primary">Salud Intercultural</p>
        <h1 className="mt-2 font-sora text-2xl font-bold text-text sm:text-3xl">
          Ayúdenos a mejorar
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Esta encuesta es privada y toma pocos minutos. No solicita diagnósticos ni muestra información interna de la clínica.
        </p>

        <div className="mt-7">
          {form.state === "open" ? <PatientFeedbackForm token={token} /> : null}
          {form.state === "submitted" ? (
            <div className="rounded-xl bg-primary/5 p-5 text-sm leading-6 text-text">
              Esta encuesta ya fue respondida. Gracias por ayudarnos a mejorar.
            </div>
          ) : null}
          {form.state === "expired" ? (
            <div className="rounded-xl bg-warning/10 p-5 text-sm leading-6 text-text">
              Este enlace venció. Puede comunicarse directamente con la clínica si todavía desea dejar su opinión.
            </div>
          ) : null}
          {form.state === "invalid" ? (
            <div className="rounded-xl bg-error/10 p-5 text-sm leading-6 text-text">
              Este enlace no está disponible. Verifique que esté completo o solicite uno nuevo a la clínica.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
