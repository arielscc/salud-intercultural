import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, CheckCircle2, MessageCircle, SlidersHorizontal, UserPlus } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { activeTeamMembers, teamMembers } from "@/data/team";
import { siteUrl } from "@/lib/seo";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Equipo médico | Salud Intercultural",
  description:
    "Conoce al equipo médico de Salud Intercultural: Dra. Cinthia Jessica Chipana Chipana, Dr. Jhonn Franco Chipana Chipana y perfiles futuros administrables desde el panel.",
  alternates: {
    canonical: `${siteUrl}/equipo`
  },
  openGraph: {
    title: "Equipo médico | Salud Intercultural",
    description:
      "Equipo profesional de Salud Intercultural preparado para gestión dinámica desde el panel administrativo.",
    url: `${siteUrl}/equipo`,
    type: "website"
  }
};

export default function EquipoPage() {
  return (
    <main className="pt-20">
      <section className="premium-hero-surface premium-grid py-20 sm:py-24">
        <Container className="grid items-end gap-10 lg:grid-cols-[1fr_0.78fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-dark">
              Equipo médico
            </p>
            <h1 className="text-balance mt-5 font-sora text-4xl font-semibold leading-tight tracking-normal text-text sm:text-5xl">
              Profesionales para una atención integral e intercultural
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              Presentamos al equipo actual de Salud Intercultural y dejamos la estructura lista para sumar nuevos perfiles desde el panel administrativo, con foto, cargo, especialidad, descripción, estado y orden.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href={createWhatsAppLink("Hola, quiero agendar una consulta con el equipo de Salud Intercultural.")}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Consultar por WhatsApp
              </Button>
              <Button href="/contacto" variant="secondary">
                Solicitar información
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <PremiumCard tone="glass">
            <p className="font-sora text-3xl font-semibold text-primary-dark">
              {activeTeamMembers.length}
            </p>
            <p className="mt-2 text-sm font-semibold text-text">perfiles activos</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              El listado público solo muestra profesionales activos y respeta el orden de aparición definido para administración.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>Activo/inactivo</Badge>
              <Badge>Orden editable</Badge>
              <Badge>CMS ready</Badge>
            </div>
          </PremiumCard>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Profesionales"
            title="Equipo actual"
            description="Perfiles dinámicos basados en una estructura preparada para CMS y panel administrativo."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {activeTeamMembers.map((member) => (
              <PremiumCard key={member.id} interactive className="overflow-hidden p-0">
                <div className="grid gap-0 md:grid-cols-[16rem_1fr]">
                  <div className="relative min-h-80 bg-surface-soft md:min-h-full">
                    <Image
                      src={member.photo}
                      alt={member.photoAlt}
                      fill
                      sizes="(min-width: 1024px) 260px, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{member.role}</Badge>
                      {member.featured ? (
                        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                          Destacado
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-5 font-sora text-2xl font-semibold leading-tight text-text">
                      {member.name}
                    </h2>
                    <p className="mt-3 text-sm font-semibold text-primary-dark">
                      {member.specialty}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-muted">{member.description}</p>

                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        Formación y enfoque
                      </p>
                      <div className="mt-3 grid gap-2">
                        {member.credentials.map((credential) => (
                          <div key={credential} className="flex items-start gap-2 text-sm text-text">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                            <span>{credential}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {member.focusAreas.map((area) => (
                        <span
                          key={area}
                          className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-primary-dark"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </PremiumCard>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-surface py-20 sm:py-24">
        <Container className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <SectionHeader
            align="left"
            eyebrow="Panel"
            title="Estructura lista para administración"
            description="La página ya trabaja con campos equivalentes a un modelo administrable. En la integración de CMS, estos datos podrán editarse desde el panel."
          />
          <div className="grid gap-5">
            <PremiumCard className="grid gap-4 sm:grid-cols-[3rem_1fr]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <UserPlus className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-sora text-xl font-semibold text-text">Soporte para equipo futuro</h2>
                <p className="mt-2 text-sm leading-7 text-muted">
                  El dataset incluye un perfil inactivo de ejemplo para validar que se pueden sumar integrantes sin mostrarlos públicamente hasta activarlos.
                </p>
              </div>
            </PremiumCard>
            <PremiumCard className="grid gap-4 sm:grid-cols-[3rem_1fr]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/10 text-secondary">
                <SlidersHorizontal className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-sora text-xl font-semibold text-text">Campos administrables</h2>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Foto, nombre, cargo, especialidad, descripción, credenciales, áreas de enfoque, estado activo/inactivo, destacado y orden de aparición.
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
              <p className="font-sora text-2xl font-semibold">Equipo administrable en V2</p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/76">
                Hay {teamMembers.length} perfiles configurados en la estructura base, de los cuales {activeTeamMembers.length} se muestran públicamente. La siguiente integración podrá reemplazar este fallback por contenido desde Payload CMS.
              </p>
            </div>
            <Button
              href={createWhatsAppLink("Hola, quiero más información sobre el equipo de Salud Intercultural.")}
              target="_blank"
              rel="noreferrer"
              variant="light"
            >
              Hablar con el equipo
            </Button>
          </PremiumCard>
        </Container>
      </section>
    </main>
  );
}
