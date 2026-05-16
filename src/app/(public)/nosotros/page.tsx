import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PremiumCard } from "@/components/shared/PremiumCard";

export default function NosotrosPage() {
  return (
    <PublicPageShell
      eyebrow="Institución"
      title="Nosotros"
      description="Conoce la historia, filosofía intercultural y valores que guían la atención de Salud Intercultural."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {["Historia", "Misión y visión", "Filosofía intercultural"].map((item) => (
          <PremiumCard key={item} tone="soft">
            <h2 className="font-sora text-xl font-semibold text-text">{item}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              Bloque preparado para contenido editable desde el panel administrativo.
            </p>
          </PremiumCard>
        ))}
      </div>
    </PublicPageShell>
  );
}
