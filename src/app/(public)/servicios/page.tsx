import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { services } from "@/data/services";

export default function ServiciosPage() {
  return (
    <PublicPageShell
      eyebrow="Servicios"
      title="Servicios de medicina natural e integrativa"
      description="Explora las áreas de atención y terapias complementarias disponibles. La información se conectará al CMS en las siguientes tareas."
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <PremiumCard key={service.slug} interactive>
            <h2 className="font-sora text-xl font-semibold text-text">{service.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{service.description}</p>
          </PremiumCard>
        ))}
      </div>
    </PublicPageShell>
  );
}
