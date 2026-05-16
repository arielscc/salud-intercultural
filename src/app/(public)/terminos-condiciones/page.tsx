import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PremiumCard } from "@/components/shared/PremiumCard";

export default function TerminosCondicionesPage() {
  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Términos y condiciones"
      description="Página base para condiciones de uso, alcance informativo del sitio y límites de responsabilidad."
    >
      <PremiumCard>
        <h2 className="font-sora text-xl font-semibold text-text">Condiciones institucionales</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          El contenido definitivo se administrará en una fase posterior. La información
          publicada en el sitio es orientativa y no reemplaza una evaluación profesional.
        </p>
      </PremiumCard>
    </PublicPageShell>
  );
}
