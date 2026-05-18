import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { Icon } from "@/components/shared/Icon";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { SEOJsonLd } from "@/components/shared/SEOJsonLd";
import { SectionHeader } from "@/components/shared/SectionHeader";
import {
  getFeaturedServices,
  getPublicPageMetadata,
  getPublicServices
} from "@/lib/cms/public-content";
import { imagePlaceholder, publicImageSizes } from "@/lib/images";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata("servicios", {
    title: "Servicios de medicina natural e integrativa | Salud Intercultural",
    description:
      "Conoce los servicios principales de Salud Intercultural: consulta médica, sueroterapia, ozonoterapia, terapias complementarias y tratamientos naturales personalizados en El Alto.",
    path: "/servicios"
  });
}

export default async function ServiciosPage() {
  const services = await getPublicServices();
  const activeServices = services.data.filter((service) => service.active);
  const featuredServices = getFeaturedServices(activeServices);

  return (
    <>
      <SEOJsonLd
        breadcrumbs={[
          { name: "Inicio", path: "/" },
          { name: "Servicios", path: "/servicios" }
        ]}
        includeFaqs={false}
        services={activeServices}
      />
      <main id="contenido-principal" tabIndex={-1} className="pt-20">
      <section className="premium-hero-surface premium-grid py-20 sm:py-24">
        <Container className="grid items-end gap-10 lg:grid-cols-[1fr_0.78fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-dark">
              Servicios
            </p>
            <h1 className="text-balance mt-5 font-sora text-4xl font-semibold leading-tight tracking-normal text-text sm:text-5xl">
              Servicios de medicina natural e integrativa
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              Explora las áreas de atención y terapias complementarias de la clínica. Esta página funciona como listado general administrable, sin crear páginas SEO individuales todavía.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href={createWhatsAppLink("Hola, quiero consultar por los servicios de Salud Intercultural.")}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Consultar por WhatsApp
              </Button>
              <Button href="/contacto" variant="secondary">
                Ver contacto
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <PremiumCard tone="glass">
            <p className="font-sora text-3xl font-semibold text-primary-dark">{activeServices.length}</p>
            <p className="mt-2 text-sm font-semibold text-text">servicios activos</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              Cada servicio incluye imagen, beneficios, problemas relacionados, CTA y metadata SEO preparada para CMS.
            </p>
          </PremiumCard>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Destacados"
            title="Servicios destacados"
            description="Selección principal para conversión. En el panel se podrá activar o desactivar qué servicios aparecen como destacados."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {featuredServices.length > 0 ? featuredServices.map((service) => (
              <PremiumCard key={service.slug} interactive className="overflow-hidden p-0">
                <div className="relative aspect-[16/10]">
                  <Image
                    src={service.image}
                    alt={service.imageAlt}
                    fill
                    placeholder="blur"
                    blurDataURL={imagePlaceholder}
                    sizes={publicImageSizes.serviceCard}
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon name={service.icon} className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                      Destacado
                    </span>
                  </div>
                  <h2 className="mt-5 font-sora text-xl font-semibold text-text">{service.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted">{service.description}</p>
                  <Button
                    href={createWhatsAppLink(service.whatsappMessage)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 w-full"
                  >
                    Consultar servicio
                  </Button>
                </div>
              </PremiumCard>
            )) : (
              <PremiumCard tone="empty" className="lg:col-span-3">
                <p className="font-sora text-lg font-semibold text-text">No hay servicios destacados publicados.</p>
                <p className="mt-2 text-sm leading-7 text-muted">Cuando se marque un servicio como destacado en el CMS aparecerá en esta sección.</p>
              </PremiumCard>
            )}
          </div>
        </Container>
      </section>

      <section className="bg-surface py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Listado general"
            title="Todos los servicios activos"
            description="Listado administrable preparado para Payload CMS. Los servicios inactivos no se muestran públicamente."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {activeServices.length > 0 ? activeServices.map((service) => (
              <PremiumCard key={service.slug} className="grid gap-5 lg:grid-cols-[13rem_1fr]">
                <div className="relative min-h-56 overflow-hidden rounded-[1.5rem] bg-surface-soft lg:min-h-full">
                  <Image
                    src={service.image}
                    alt={service.imageAlt}
                    fill
                    placeholder="blur"
                    blurDataURL={imagePlaceholder}
                    sizes={publicImageSizes.serviceThumb}
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon name={service.icon} className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-primary-dark">
                      Activo
                    </span>
                    {service.featured ? (
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                        Destacado
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-4 font-sora text-2xl font-semibold text-text">{service.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted">{service.description}</p>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Beneficios</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {service.benefits.map((benefit) => (
                        <span key={benefit} className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-primary-dark">
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Problemas relacionados</p>
                    <p className="mt-2 text-sm leading-7 text-text">{service.relatedProblems.join(" · ")}</p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">SEO CMS</p>
                    <p className="mt-2 text-sm font-semibold text-text">{service.seo.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{service.seo.description}</p>
                  </div>

                  <Button
                    href={createWhatsAppLink(service.whatsappMessage)}
                    target="_blank"
                    rel="noreferrer"
                    variant="secondary"
                    className="mt-6"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Consultar por WhatsApp
                  </Button>
                </div>
              </PremiumCard>
            )) : (
              <PremiumCard tone="empty" className="md:col-span-2">
                <p className="font-sora text-lg font-semibold text-text">No hay servicios publicados.</p>
                <p className="mt-2 text-sm leading-7 text-muted">El sitio mantiene un fallback local cuando el CMS está vacío o no disponible.</p>
              </PremiumCard>
            )}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <PremiumCard className="grid gap-6 bg-primary-dark text-white lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-sora text-2xl font-semibold">Página preparada para administración</p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/76">
                Los servicios ya tienen campos compatibles con CMS: slug, imagen, nombre, descripción, beneficios, problemas relacionados, CTA WhatsApp, SEO, estado activo/inactivo y destacado.
              </p>
            </div>
            <Button
              href={createWhatsAppLink("Hola, quiero orientación sobre qué servicio necesito.")}
              target="_blank"
              rel="noreferrer"
              variant="light"
            >
              Orientarme por WhatsApp
            </Button>
          </PremiumCard>
        </Container>
      </section>
      </main>
    </>
  );
}
