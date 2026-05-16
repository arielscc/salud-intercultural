import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { problems } from "@/data/problems";

export default function TratamientosPage() {
  return (
    <PublicPageShell
      eyebrow="Tratamientos"
      title="Orientación general para problemas frecuentes"
      description="Una vista institucional para agrupar problemas frecuentes y llamados a evaluación, sin crear páginas SEO individuales todavía."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {problems.map((problem) => (
          <PremiumCard key={problem.title} interactive>
            <h2 className="font-sora text-xl font-semibold text-text">{problem.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{problem.description}</p>
          </PremiumCard>
        ))}
      </div>
    </PublicPageShell>
  );
}
