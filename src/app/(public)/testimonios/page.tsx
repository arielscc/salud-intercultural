import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { testimonials } from "@/data/testimonials";

export default function TestimoniosPage() {
  return (
    <PublicPageShell
      eyebrow="Testimonios"
      title="Experiencias de pacientes"
      description="Base pública para testimonios dinámicos, preparada para fotos y videos futuros."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {testimonials.map((testimonial) => (
          <PremiumCard key={testimonial.author}>
            <p className="text-sm leading-7 text-muted">“{testimonial.quote}”</p>
            <p className="mt-5 font-sora font-semibold text-text">{testimonial.author}</p>
          </PremiumCard>
        ))}
      </div>
    </PublicPageShell>
  );
}
