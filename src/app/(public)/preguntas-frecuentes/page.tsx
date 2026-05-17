import type { Metadata } from "next";
import { ArrowRight, HelpCircle, MessageCircle, SearchCheck, Settings2 } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { FaqFilterList } from "@/components/public/FaqFilterList";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { faqCategories } from "@/data/faqs";
import {
  getFeaturedFaqs,
  getPublicFaqs,
  getPublicPageMetadata
} from "@/lib/cms/public-content";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata("preguntas-frecuentes", {
    title: "Preguntas frecuentes | Salud Intercultural",
    description:
      "Resuelve dudas frecuentes sobre citas, ubicación, WhatsApp, llamadas, tratamientos personalizados, costos y atención en Salud Intercultural.",
    path: "/preguntas-frecuentes"
  });
}

export default async function PreguntasFrecuentesPage() {
  const faqs = await getPublicFaqs();
  const activeFaqs = faqs.data.filter((faq) => faq.active);
  const featuredFaqs = getFeaturedFaqs(activeFaqs);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: activeFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <main className="pt-20">
        <section className="premium-hero-surface premium-grid py-20 sm:py-24">
          <Container className="grid items-end gap-10 lg:grid-cols-[1fr_0.78fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-dark">
                Preguntas frecuentes
              </p>
              <h1 className="text-balance mt-5 font-sora text-4xl font-semibold leading-tight tracking-normal text-text sm:text-5xl">
                Respuestas claras antes de agendar tu consulta
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
                Organizamos las dudas principales sobre citas, ubicación, contacto, tratamientos y costos para reducir fricción antes de convertir una visita en consulta.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  href={createWhatsAppLink("Hola, tengo una pregunta sobre la atención de Salud Intercultural.")}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Preguntar por WhatsApp
                </Button>
                <Button href="/contacto" variant="secondary">
                  Ir a contacto
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <PremiumCard tone="glass">
              <p className="font-sora text-3xl font-semibold text-primary-dark">
                {activeFaqs.length}
              </p>
              <p className="mt-2 text-sm font-semibold text-text">preguntas activas</p>
              <p className="mt-3 text-sm leading-7 text-muted">
                Cada pregunta tiene categoría, estado activo/inactivo, destacado para home y orden de aparición.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge>{faqCategories.length - 1} categorías</Badge>
                <Badge>{featuredFaqs.length} destacadas</Badge>
                <Badge>FAQ Schema</Badge>
              </div>
            </PremiumCard>
          </Container>
        </section>

        <section className="py-20 sm:py-24">
          <Container>
            <SectionHeader
              eyebrow="Buscar respuestas"
              title="Preguntas organizadas por categoría"
              description="Usa el filtro o busca por palabra clave. Si no encuentras una respuesta, puedes escribir directamente por WhatsApp."
            />
            <div className="mt-12">
              <FaqFilterList faqs={activeFaqs} />
            </div>
          </Container>
        </section>

        <section className="bg-surface py-20 sm:py-24">
          <Container className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
            <SectionHeader
              align="left"
              eyebrow="Administración"
              title="Contenido preparado para CMS"
              description="La página usa campos equivalentes a un modelo administrable y se puede conectar al panel en las siguientes tareas."
            />
            <div className="grid gap-5">
              <PremiumCard className="grid gap-4 sm:grid-cols-[3rem_1fr]">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Settings2 className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-sora text-xl font-semibold text-text">
                    Estado, orden y destacados
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    Las FAQs inactivas no se muestran públicamente. Las destacadas alimentan la sección de preguntas frecuentes de la home.
                  </p>
                </div>
              </PremiumCard>
              <PremiumCard className="grid gap-4 sm:grid-cols-[3rem_1fr]">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/10 text-secondary">
                  <SearchCheck className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-sora text-xl font-semibold text-text">
                    SEO estructurado
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    La página incluye JSON-LD tipo FAQPage con preguntas activas para mejorar comprensión de buscadores.
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
                <p className="font-sora text-2xl font-semibold">¿No encontraste tu duda?</p>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/76">
                  Hay {faqs.data.length} preguntas disponibles y {activeFaqs.length} visibles. Si necesitas una respuesta personalizada, escríbenos o agenda una consulta.
                </p>
              </div>
              <Button
                href={createWhatsAppLink("Hola, no encontré respuesta a mi pregunta en la página de preguntas frecuentes.")}
                target="_blank"
                rel="noreferrer"
                variant="light"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Resolver mi duda
              </Button>
            </PremiumCard>
          </Container>
        </section>
      </main>
    </>
  );
}
