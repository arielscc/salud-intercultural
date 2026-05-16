import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { faqs } from "@/data/faqs";

export default function PreguntasFrecuentesPage() {
  return (
    <PublicPageShell
      eyebrow="FAQ"
      title="Preguntas frecuentes"
      description="Respuestas iniciales a dudas comunes, listas para convertirse en contenido administrable y FAQ Schema dinámico."
    >
      <div className="grid gap-4">
        {faqs.map((faq) => (
          <PremiumCard key={faq.question}>
            <h2 className="font-sora text-lg font-semibold text-text">{faq.question}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{faq.answer}</p>
          </PremiumCard>
        ))}
      </div>
    </PublicPageShell>
  );
}
