import type { Metadata } from "next";
import { ArrowRight, FileCheck2, Info, MessageCircle, Scale, Stethoscope } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { siteConfig } from "@/config/site";
import { siteUrl } from "@/lib/seo";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Términos y condiciones | Salud Intercultural",
  description:
    "Condiciones generales de uso del sitio de Salud Intercultural, alcance informativo del contenido publicado y límites de responsabilidad.",
  alternates: {
    canonical: `${siteUrl}/terminos-condiciones`
  },
  openGraph: {
    title: "Términos y condiciones | Salud Intercultural",
    description:
      "Base legal mínima sobre uso del sitio, contenido informativo y atención profesional en Salud Intercultural.",
    url: `${siteUrl}/terminos-condiciones`,
    type: "website"
  }
};

const termsSections = [
  {
    title: "Uso del sitio",
    description:
      "El sitio web presenta información institucional, servicios generales, canales de contacto y contenido orientativo para facilitar la comunicación con Salud Intercultural.",
    icon: Info
  },
  {
    title: "Alcance médico de la información",
    description:
      "La información publicada no constituye diagnóstico, prescripción ni indicación terapéutica personalizada. Cada caso debe evaluarse individualmente por un profesional.",
    icon: Stethoscope
  },
  {
    title: "Canales de contacto",
    description:
      "Los formularios, WhatsApp, llamadas y correos permiten solicitar información o coordinación. El envío de datos no garantiza disponibilidad inmediata ni reemplaza una consulta.",
    icon: FileCheck2
  },
  {
    title: "Responsabilidad del usuario",
    description:
      "La persona usuaria debe entregar información veraz, evitar compartir datos sensibles innecesarios por canales públicos y acudir a atención de emergencia si su situación lo requiere.",
    icon: Scale
  }
] as const;

export default function TerminosCondicionesPage() {
  return (
    <main className="pt-20">
      <section className="premium-hero-surface premium-grid py-20 sm:py-24">
        <Container className="grid items-end gap-10 lg:grid-cols-[1fr_0.78fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-dark">
              Legal
            </p>
            <h1 className="text-balance mt-5 font-sora text-4xl font-semibold leading-tight tracking-normal text-text sm:text-5xl">
              Términos y condiciones
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              Estos términos describen el uso general del sitio, el alcance informativo de sus contenidos y las condiciones básicas de contacto con Salud Intercultural.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href={createWhatsAppLink("Hola, tengo una consulta sobre los términos del sitio.")}
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
            <p className="font-sora text-2xl font-semibold text-primary-dark">
              Información orientativa
            </p>
            <p className="mt-3 text-sm leading-7 text-muted">
              El contenido publicado no reemplaza una consulta profesional ni una evaluación médica individual.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>Uso del sitio</Badge>
              <Badge>Alcance informativo</Badge>
              <Badge>Contacto</Badge>
            </div>
          </PremiumCard>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Condiciones"
            title="Base de uso del sitio público"
            description="Estas condiciones establecen un marco mínimo para el uso responsable de la información publicada."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {termsSections.map((section) => {
              const Icon = section.icon;

              return (
                <PremiumCard key={section.title} className="h-full">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h2 className="mt-5 font-sora text-xl font-semibold text-text">
                    {section.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted">{section.description}</p>
                </PremiumCard>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="bg-surface py-20 sm:py-24">
        <Container>
          <PremiumCard>
            <h2 className="font-sora text-2xl font-semibold text-text">
              Contenido administrable y revisión futura
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
              <p>
                Salud Intercultural puede actualizar estos términos para reflejar cambios del sitio, canales de contacto, servicios publicados o requerimientos operativos. La versión vigente será la publicada en esta ruta.
              </p>
              <p>
                Para consultas sobre el uso del sitio o información institucional, comunícate por WhatsApp {siteConfig.contact.whatsapp}, teléfono {siteConfig.contact.phone} o correo {siteConfig.contact.email}.
              </p>
            </div>
          </PremiumCard>
        </Container>
      </section>
    </main>
  );
}
