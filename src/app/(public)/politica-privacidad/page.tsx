import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PremiumCard } from "@/components/shared/PremiumCard";

export default function PoliticaPrivacidadPage() {
  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Política de privacidad"
      description="Página base para explicar el tratamiento de datos de contacto y consultas enviadas por el sitio."
    >
      <PremiumCard>
        <h2 className="font-sora text-xl font-semibold text-text">Contenido legal editable</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          Esta página queda preparada para incorporar la política definitiva de privacidad,
          consentimiento, uso de datos de contacto y canales de atención.
        </p>
      </PremiumCard>
    </PublicPageShell>
  );
}
