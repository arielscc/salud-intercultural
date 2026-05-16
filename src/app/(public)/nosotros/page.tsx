import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { Icon } from "@/components/shared/Icon";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { aboutContent } from "@/data/about";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: aboutContent.seo.title,
  description: aboutContent.seo.description,
  alternates: {
    canonical: `${siteUrl}/nosotros`
  },
  openGraph: {
    title: aboutContent.seo.title,
    description: aboutContent.seo.description,
    url: `${siteUrl}/nosotros`,
    type: "website"
  }
};

export default function NosotrosPage() {
  return (
    <main className="pt-20">
      <section className="premium-hero-surface premium-grid py-20 sm:py-24">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-dark">
              {aboutContent.hero.eyebrow}
            </p>
            <h1 className="text-balance mt-5 font-sora text-4xl font-semibold leading-tight tracking-normal text-text sm:text-5xl">
              {aboutContent.hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              {aboutContent.hero.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href={createWhatsAppLink("Hola, quiero conocer más sobre Salud Intercultural.")}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Hablar por WhatsApp
              </Button>
              <Button href="/contacto" variant="secondary">
                Ir a contacto
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-surface shadow-lift">
              <Image
                src={aboutContent.hero.image}
                alt={aboutContent.hero.imageAlt}
                fill
                priority
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="object-cover"
              />
            </div>
            <PremiumCard tone="glass" className="absolute bottom-5 left-5 right-5">
              <p className="font-sora text-lg font-semibold text-text">Salud integral</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Atención que considera cuerpo, mente, hábitos, cultura y acompañamiento humano.
              </p>
            </PremiumCard>
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <SectionHeader
            align="left"
            eyebrow="Historia"
            title={aboutContent.history.title}
            description="Una base institucional clara para fortalecer confianza antes de la consulta."
          />
          <PremiumCard>
            <div className="space-y-5 text-base leading-8 text-muted">
              {aboutContent.history.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </PremiumCard>
        </Container>
      </section>

      <section className="bg-surface py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Propósito"
            title="Misión y visión"
            description="La página queda preparada para que estos bloques sean editables desde el CMS."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {aboutContent.missionVision.map((item) => (
              <PremiumCard key={item.title} interactive>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon name={item.icon} className="h-6 w-6" />
                </span>
                <h2 className="mt-5 font-sora text-2xl font-semibold text-text">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
              </PremiumCard>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Valores"
            title="Principios que guían la atención"
            description="Valores institucionales orientados a construir confianza, claridad y acompañamiento responsable."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {aboutContent.values.map((value) => (
              <PremiumCard key={value.title} tone="soft" className="h-full">
                <Icon name={value.icon} className="h-6 w-6 text-primary" />
                <h2 className="mt-4 font-sora text-lg font-semibold text-text">{value.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{value.description}</p>
              </PremiumCard>
            ))}
          </div>
        </Container>
      </section>

      <section className="premium-gradient-soft py-20 sm:py-24">
        <Container className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeader
            align="left"
            eyebrow="Interculturalidad"
            title={aboutContent.philosophy.title}
            description={aboutContent.philosophy.description}
          />
          <PremiumCard>
            <div className="grid gap-4">
              {aboutContent.philosophy.principles.map((principle, index) => (
                <div key={principle} className="flex gap-4 rounded-2xl bg-surface-soft/70 p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-6 text-text">{principle}</p>
                </div>
              ))}
            </div>
          </PremiumCard>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Equipo"
            title="Equipo destacado"
            description="Perfiles listos para conectarse al panel administrativo con fotos, cargo, especialidad y descripción."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {aboutContent.team.map((member) => (
              <PremiumCard key={member.name} className="grid gap-5 sm:grid-cols-[9rem_1fr]">
                <div className="grid aspect-square place-items-center rounded-[1.5rem] bg-surface-soft text-3xl font-semibold text-primary">
                  SI
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-dark">{member.role}</p>
                  <h2 className="mt-2 font-sora text-xl font-semibold text-text">{member.name}</h2>
                  <p className="mt-2 text-sm font-semibold text-muted">{member.specialty}</p>
                  <p className="mt-3 text-sm leading-7 text-muted">{member.description}</p>
                </div>
              </PremiumCard>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-surface py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Fotografías"
            title="Imagen institucional preparada para fotos reales"
            description="Galería temporal con estructura lista para multimedia administrable desde CMS."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {aboutContent.gallery.map((image) => (
              <div
                key={image.src}
                className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-soft"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <PremiumCard className="grid gap-6 bg-primary-dark text-white lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-sora text-2xl font-semibold">Contenido institucional editable</p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/76">
                {aboutContent.cmsNote}
              </p>
            </div>
            <Button href="/contacto" variant="light">
              Contactar ahora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </PremiumCard>
        </Container>
      </section>
    </main>
  );
}
