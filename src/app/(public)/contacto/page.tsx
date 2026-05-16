import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarClock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck
} from "lucide-react";
import { MapSection } from "@/components/landing/MapSection";
import { ContactLeadForm } from "@/components/public/ContactLeadForm";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { siteConfig } from "@/config/site";
import { clinic } from "@/data/clinic";
import { siteUrl } from "@/lib/seo";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contacto | Salud Intercultural",
  description:
    "Contacta a Salud Intercultural por WhatsApp, llamada o formulario. Encuentra dirección, horarios, mapa y canales oficiales en El Alto.",
  alternates: {
    canonical: `${siteUrl}/contacto`
  },
  openGraph: {
    title: "Contacto | Salud Intercultural",
    description:
      "Canales de contacto, formulario de leads, WhatsApp, llamada, dirección, horarios y mapa de Salud Intercultural.",
    url: `${siteUrl}/contacto`,
    type: "website"
  }
};

const contactChannels = [
  {
    label: "WhatsApp",
    value: siteConfig.contact.whatsapp,
    description: "Canal principal para agendar y resolver dudas rápidas.",
    href: createWhatsAppLink("Hola, quiero agendar una valoración en Salud Intercultural."),
    icon: MessageCircle,
    external: true
  },
  {
    label: "Llamada",
    value: siteConfig.contact.phone,
    description: "Contacto directo para consultas o coordinación de visita.",
    href: `tel:${siteConfig.contact.phone}`,
    icon: Phone,
    external: false
  },
  {
    label: "Correo",
    value: siteConfig.contact.email,
    description: "Canal institucional para mensajes no urgentes.",
    href: `mailto:${siteConfig.contact.email}`,
    icon: Mail,
    external: false
  }
] as const;

const locationDetails = [
  {
    label: "Dirección",
    value: siteConfig.contact.address,
    icon: MapPin
  },
  {
    label: "Zona",
    value: `${siteConfig.contact.zone}, ${siteConfig.contact.city}`,
    icon: MapPin
  },
  {
    label: "Horario",
    value: siteConfig.contact.schedule,
    icon: CalendarClock
  }
] as const;

export default function ContactoPage() {
  return (
    <main className="pt-20">
      <section className="premium-hero-surface premium-grid py-20 sm:py-24">
        <Container className="grid items-end gap-10 lg:grid-cols-[1fr_0.78fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-dark">
              Contacto
            </p>
            <h1 className="text-balance mt-5 font-sora text-4xl font-semibold leading-tight tracking-normal text-text sm:text-5xl">
              Comunícate con Salud Intercultural
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              Centralizamos WhatsApp, llamada, dirección, horarios, mapa y formulario para que puedas resolver dudas o agendar una valoración sin fricción.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href={createWhatsAppLink("Hola, quiero agendar una consulta en Salud Intercultural.")}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Escribir por WhatsApp
              </Button>
              <Button href={`tel:${siteConfig.contact.phone}`} variant="secondary">
                <Phone className="mr-2 h-4 w-4" />
                Llamar ahora
              </Button>
            </div>
          </div>
          <PremiumCard tone="glass">
            <p className="font-sora text-2xl font-semibold text-primary-dark">
              {clinic.shortName}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted">
              {siteConfig.contact.zone}, {siteConfig.contact.city}. Atención de lunes a sábado con coordinación previa recomendada.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>WhatsApp</Badge>
              <Badge>Llamada</Badge>
              <Badge>Formulario lead</Badge>
            </div>
          </PremiumCard>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Canales"
            title="Elige el canal que prefieras"
            description="Los datos institucionales están centralizados para que luego puedan administrarse desde configuración global."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {contactChannels.map((channel) => {
              const Icon = channel.icon;

              return (
                <PremiumCard key={channel.label} interactive className="h-full">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h2 className="mt-5 font-sora text-xl font-semibold text-text">
                    {channel.label}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-primary-dark">{channel.value}</p>
                  <p className="mt-3 text-sm leading-7 text-muted">{channel.description}</p>
                  <Button
                    href={channel.href}
                    target={channel.external ? "_blank" : undefined}
                    rel={channel.external ? "noreferrer" : undefined}
                    variant="secondary"
                    className="mt-6 w-full"
                  >
                    Contactar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </PremiumCard>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="bg-surface py-20 sm:py-24">
        <Container className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <SectionHeader
              align="left"
              eyebrow="Ubicación"
              title="Estamos en El Alto"
              description="Consulta la dirección, horarios y referencia de atención antes de visitarnos."
            />
            <div className="grid gap-4">
              {locationDetails.map((detail) => {
                const Icon = detail.icon;

                return (
                  <PremiumCard key={detail.label} tone="soft" className="grid gap-4 sm:grid-cols-[3rem_1fr]">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-background text-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h2 className="font-sora text-lg font-semibold text-text">{detail.label}</h2>
                      <p className="mt-2 text-sm leading-7 text-muted">{detail.value}</p>
                    </div>
                  </PremiumCard>
                );
              })}
            </div>
          </div>
          <MapSection />
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <SectionHeader
              align="left"
              eyebrow="Formulario"
              title="Envía tu consulta"
              description="El formulario valida los datos con React Hook Form y Zod, aplica honeypot antispam y registra el lead mediante `/api/leads`."
            />
            <PremiumCard tone="soft" className="mt-8">
              <ShieldCheck className="h-7 w-7 text-primary" />
              <h2 className="mt-4 font-sora text-xl font-semibold text-text">
                Registro para seguimiento
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                La información enviada queda preparada para el sistema de leads. En esta etapa se usa persistencia temporal de desarrollo y luego se conectará a PostgreSQL/CMS.
              </p>
            </PremiumCard>
          </div>
          <ContactLeadForm
            origin="contact"
            title="Formulario principal de contacto"
            description="Completa tus datos básicos y el motivo de consulta. Te contactaremos por el canal indicado."
          />
        </Container>
      </section>
    </main>
  );
}
