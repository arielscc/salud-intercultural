import type { Metadata } from "next";
import { ArrowRight, Database, FileText, LockKeyhole, MessageCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { siteConfig } from "@/config/site";
import { siteUrl } from "@/lib/seo";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Política de privacidad | Salud Intercultural",
  description:
    "Información sobre el tratamiento de datos personales enviados por formularios, WhatsApp, llamadas y otros canales de contacto de Salud Intercultural.",
  alternates: {
    canonical: `${siteUrl}/politica-privacidad`
  },
  openGraph: {
    title: "Política de privacidad | Salud Intercultural",
    description:
      "Base legal mínima sobre privacidad, datos personales y canales de contacto de Salud Intercultural.",
    url: `${siteUrl}/politica-privacidad`,
    type: "website"
  }
};

const privacySections = [
  {
    title: "Datos que podemos recibir",
    description:
      "Podemos recibir nombre, teléfono, correo electrónico, motivo general de consulta, mensaje enviado y canal de origen cuando una persona usa el formulario, WhatsApp, llamada, correo o redes sociales.",
    icon: Database
  },
  {
    title: "Finalidad del tratamiento",
    description:
      "Los datos se usan para responder consultas, coordinar atención, dar seguimiento a solicitudes, mejorar la comunicación institucional y mantener un registro básico de contactos recibidos.",
    icon: FileText
  },
  {
    title: "Cuidado de la información",
    description:
      "No solicitamos diagnósticos detallados ni datos médicos sensibles mediante formularios públicos. La evaluación clínica debe realizarse por canales adecuados y con atención profesional.",
    icon: LockKeyhole
  },
  {
    title: "Derechos de la persona",
    description:
      "La persona puede solicitar actualización, corrección o eliminación de sus datos de contacto escribiendo a los canales oficiales de Salud Intercultural.",
    icon: ShieldCheck
  }
] as const;

export default function PoliticaPrivacidadPage() {
  return (
    <main className="pt-20">
      <section className="premium-hero-surface premium-grid py-20 sm:py-24">
        <Container className="grid items-end gap-10 lg:grid-cols-[1fr_0.78fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-dark">
              Legal
            </p>
            <h1 className="text-balance mt-5 font-sora text-4xl font-semibold leading-tight tracking-normal text-text sm:text-5xl">
              Política de privacidad
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              Esta política explica cómo Salud Intercultural puede recibir, usar y resguardar datos de contacto enviados mediante el sitio web y canales oficiales.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href={createWhatsAppLink("Hola, tengo una consulta sobre privacidad y uso de datos.")}
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
              Base legal mínima
            </p>
            <p className="mt-3 text-sm leading-7 text-muted">
              Contenido preparado para futura edición desde CMS y revisión legal definitiva.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>Datos personales</Badge>
              <Badge>Formulario</Badge>
              <Badge>WhatsApp</Badge>
            </div>
          </PremiumCard>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Privacidad"
            title="Tratamiento de datos personales"
            description="La información enviada por canales públicos se usa solo para atención, seguimiento y comunicación institucional."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {privacySections.map((section) => {
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
              Canales oficiales y contenido editable
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
              <p>
                Los canales oficiales son WhatsApp {siteConfig.contact.whatsapp}, teléfono {siteConfig.contact.phone} y correo {siteConfig.contact.email}. Las solicitudes relacionadas con datos personales pueden realizarse por cualquiera de estos medios.
              </p>
              <p>
                Esta página es una base institucional inicial. En una fase posterior, el contenido legal podrá ser administrado desde CMS y revisado por asesoría legal según la normativa aplicable.
              </p>
            </div>
          </PremiumCard>
        </Container>
      </section>
    </main>
  );
}
