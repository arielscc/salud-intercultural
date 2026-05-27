import type { Metadata } from "next";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { Icon } from "@/components/shared/Icon";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { SEOJsonLd } from "@/components/shared/SEOJsonLd";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { treatmentsContent } from "@/data/treatments";
import {
  getPublicPage,
  getPublicPageMetadata,
  getPublicTreatmentTopics
} from "@/lib/cms/public-content";
import { createWhatsAppLink } from "@/lib/whatsapp";
import type { Page } from "@/types/payload-types";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata("tratamientos", {
    title: treatmentsContent.seo.title,
    description: treatmentsContent.seo.description,
    path: "/tratamientos"
  });
}

function mapCmsTreatmentsContent(page: Page | null) {
  if (!page) return treatmentsContent;

  const overviewParagraphs =
    page.content
      ?.split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean) ?? treatmentsContent.overview.paragraphs;

  return {
    ...treatmentsContent,
    hero: {
      ...treatmentsContent.hero,
      eyebrow: page.hero?.eyebrow || treatmentsContent.hero.eyebrow,
      title: page.title || treatmentsContent.hero.title,
      description: page.summary || treatmentsContent.hero.description
    },
    overview: {
      ...treatmentsContent.overview,
      paragraphs: overviewParagraphs
    }
  };
}

export default async function TratamientosPage() {
  const [page, treatmentTopics] = await Promise.all([
    getPublicPage("tratamientos"),
    getPublicTreatmentTopics()
  ]);
  const content = mapCmsTreatmentsContent(page.data);
  const problems = treatmentTopics.data;

  return (
    <>
      <SEOJsonLd
        breadcrumbs={[
          { name: "Inicio", path: "/" },
          { name: "Tratamientos", path: "/tratamientos" }
        ]}
        includeFaqs={false}
        includeServices={false}
      />
      <main id="contenido-principal" tabIndex={-1} className="pt-20">
      <section className="premium-hero-surface premium-grid py-20 sm:py-24">
        <Container className="grid items-end gap-10 lg:grid-cols-[1fr_0.78fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-dark">
              {content.hero.eyebrow}
            </p>
            <h1 className="text-balance mt-5 font-sora text-4xl font-semibold leading-tight tracking-normal text-text sm:text-5xl">
              {content.hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              {content.hero.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href={createWhatsAppLink("Hola, quiero orientación sobre un tratamiento.")}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Consultar por WhatsApp
              </Button>
              <Button href="/contacto" variant="secondary">
                Completar formulario
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <PremiumCard tone="glass">
            <p className="font-sora text-3xl font-semibold text-primary-dark">{problems.length}</p>
            <p className="mt-2 text-sm font-semibold text-text">problemas frecuentes agrupados</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              Vista general sin rutas individuales, preparada para contenido administrable.
            </p>
          </PremiumCard>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <SectionHeader
            align="left"
            eyebrow="Información general"
            title={content.overview.title}
            description="Un marco institucional para orientar, no para diagnosticar en línea."
          />
          <PremiumCard>
            <div className="space-y-5 text-base leading-8 text-muted">
              {content.overview.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </PremiumCard>
        </Container>
      </section>

      <section className="bg-surface py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Problemas frecuentes"
            title="Casos que orientamos con enfoque integral"
            description="Cada card es informativa y lleva a una evaluación. No existen páginas individuales por tratamiento en esta fase."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {problems.map((problem) => (
              <PremiumCard key={problem.title} interactive className="flex h-full flex-col">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon name={problem.icon} className="h-6 w-6" />
                </span>
                <p className="mt-5 text-sm font-semibold text-primary">{problem.title}</p>
                <h2 className="mt-2 font-sora text-xl font-semibold leading-7 text-text">
                  {problem.headline}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted">{problem.description}</p>
                <Button
                  href={createWhatsAppLink(problem.whatsappMessage)}
                  target="_blank"
                  rel="noreferrer"
                  variant="secondary"
                  className="mt-auto pt-6"
                >
                  {problem.cta}
                </Button>
              </PremiumCard>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Orientación complementaria"
            title="Cómo acompañamos el proceso"
            description="La orientación se adapta a cada persona y se comunica con responsabilidad."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {content.complementaryGuidance.map((item) => (
              <PremiumCard key={item.title} tone="soft">
                <h2 className="font-sora text-xl font-semibold text-text">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
              </PremiumCard>
            ))}
          </div>
        </Container>
      </section>

      <section className="premium-gradient-soft py-20 sm:py-24">
        <Container className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeader
            align="left"
            eyebrow="Evaluación"
            title="Llamado a evaluación"
            description="El siguiente paso no es elegir un tratamiento por nombre, sino coordinar una valoración para entender el caso."
          />
          <PremiumCard>
            <div className="grid gap-4">
              {content.evaluationSteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl bg-surface-soft/70 p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-6 text-text">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                href={createWhatsAppLink("Hola, quiero coordinar una evaluación para tratamiento.")}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              <Button href="/contacto" variant="secondary">
                Formulario de contacto
              </Button>
            </div>
          </PremiumCard>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <PremiumCard className="grid gap-6 bg-primary-dark text-white lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-sora text-2xl font-semibold">Contenido administrable</p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/76">
                {content.cmsNote}
              </p>
            </div>
            <Button href="/contacto" variant="light">
              Solicitar evaluación
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </PremiumCard>
        </Container>
      </section>
      </main>
    </>
  );
}
