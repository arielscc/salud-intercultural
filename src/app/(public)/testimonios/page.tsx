import type { Metadata } from "next";
import { ArrowRight, CalendarDays, LockKeyhole, MessageCircle, Quote, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { SEOJsonLd } from "@/components/shared/SEOJsonLd";
import { SectionHeader } from "@/components/shared/SectionHeader";
import {
  getPublicPageMetadata,
  getPublicTestimonials
} from "@/lib/cms/public-content";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata("testimonios", {
    title: "Testimonios de pacientes | Salud Intercultural",
    description:
      "Experiencias de pacientes de Salud Intercultural con identidad reservada, motivo de consulta y valoración opcional.",
    path: "/testimonios"
  });
}

function formatDate(date?: string) {
  if (!date) {
    return "Fecha no publicada";
  }

  return new Intl.DateTimeFormat("es-BO", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

export default async function TestimoniosPage() {
  const testimonials = await getPublicTestimonials();
  const activeTestimonials = testimonials.data.filter((testimonial) => testimonial.active);

  return (
    <>
      <SEOJsonLd
        breadcrumbs={[
          { name: "Inicio", path: "/" },
          { name: "Testimonios", path: "/testimonios" }
        ]}
        includeFaqs={false}
        includeServices={false}
      />
      <main id="contenido-principal" tabIndex={-1} className="pt-20">
      <section className="premium-hero-surface premium-grid py-20 sm:py-24">
        <Container className="grid items-end gap-10 lg:grid-cols-[1fr_0.78fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-dark">
              Testimonios
            </p>
            <h1 className="text-balance mt-5 font-sora text-4xl font-semibold leading-tight tracking-normal text-text sm:text-5xl">
              Experiencias que ayudan a construir confianza
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              Testimonios de pacientes publicados con enfoque responsable, identidad protegida cuando corresponde y sin exponer datos clínicos sensibles. La estructura queda lista para administración desde el panel.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href={createWhatsAppLink("Hola, quiero consultar por la atención de Salud Intercultural.")}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Consultar por WhatsApp
              </Button>
              <Button href="/contacto" variant="secondary">
                Ir a contacto
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <PremiumCard tone="glass">
            <p className="font-sora text-3xl font-semibold text-primary-dark">
              {activeTestimonials.length}
            </p>
            <p className="mt-2 text-sm font-semibold text-text">testimonios activos</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              El listado público muestra solo testimonios activos y respeta el orden definido para administración.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>Rating opcional</Badge>
              <Badge>Fecha opcional</Badge>
              <Badge>CMS ready</Badge>
            </div>
          </PremiumCard>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Prueba social"
            title="Lo que valoran nuestros pacientes"
            description="Cada testimonio tiene motivo de consulta, autor visible o iniciales, valoración opcional, fecha opcional, estado y orden de aparición."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {activeTestimonials.length > 0 ? activeTestimonials.map((testimonial) => (
              <PremiumCard key={testimonial.id} interactive className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Quote className="h-6 w-6" />
                  </span>
                  {testimonial.featured ? (
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                      Destacado
                    </span>
                  ) : null}
                </div>

                {testimonial.rating ? (
                  <div
                    className="mt-5 flex gap-1 text-accent"
                    aria-label={`Valoración de ${testimonial.rating} de 5`}
                  >
                    {Array.from({ length: testimonial.rating }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                ) : null}

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">
                  {testimonial.treatmentType}
                </p>
                <p className="mt-4 flex-1 text-base leading-8 text-text">
                  “{testimonial.quote}”
                </p>
                <div className="mt-6 border-t border-border pt-5">
                  <p className="font-sora text-lg font-semibold text-text">{testimonial.author}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {formatDate(testimonial.date)}
                  </p>
                  {testimonial.privacyNotice ? (
                    <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
                      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {testimonial.privacyNotice}
                    </p>
                  ) : null}
                </div>
              </PremiumCard>
            )) : (
              <PremiumCard tone="empty" className="lg:col-span-3">
                <p className="font-sora text-lg font-semibold text-text">No hay testimonios publicados.</p>
                <p className="mt-2 text-sm leading-7 text-muted">Cuando existan testimonios activos en el CMS aparecerán en esta sección.</p>
              </PremiumCard>
            )}
          </div>
        </Container>
      </section>

      <section className="bg-surface py-20 sm:py-24">
        <Container className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <SectionHeader
            align="left"
            eyebrow="Privacidad"
            title="Testimonios publicados con cuidado"
            description="La confianza no debe exponerse a costa de datos personales. La página contempla avisos de privacidad y publicación con identidad reservada."
          />
          <div className="grid gap-5">
            <PremiumCard className="grid gap-4 sm:grid-cols-[3rem_1fr]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-sora text-xl font-semibold text-text">Identidad protegida</h2>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Los testimonios pueden usar nombre, iniciales o una referencia general como “Paciente de El Alto”, según autorización.
                </p>
              </div>
            </PremiumCard>
            <PremiumCard className="grid gap-4 sm:grid-cols-[3rem_1fr]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/10 text-secondary">
                <LockKeyhole className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-sora text-xl font-semibold text-text">Sin datos sensibles</h2>
                <p className="mt-2 text-sm leading-7 text-muted">
                  La estructura evita publicar diagnósticos privados o información clínica específica. El motivo de consulta se mantiene en términos generales.
                </p>
              </div>
            </PremiumCard>
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <PremiumCard className="grid gap-6 bg-primary-dark text-white lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-sora text-2xl font-semibold">Testimonios administrables en V2</p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/76">
                Hay {testimonials.data.length} testimonios disponibles, de los cuales {activeTestimonials.length} se muestran públicamente. El CMS puede editar autor, motivo, rating, fecha, estado, destacado y orden.
              </p>
            </div>
            <Button href="/contacto" variant="light">
              Agendar consulta
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </PremiumCard>
        </Container>
      </section>
      </main>
    </>
  );
}
