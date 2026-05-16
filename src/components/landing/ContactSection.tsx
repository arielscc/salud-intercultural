"use client";

import { MessageCircle, Phone } from "lucide-react";
import { ContactLeadForm } from "@/components/public/ContactLeadForm";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MapSection } from "@/components/landing/MapSection";
import { clinic } from "@/data/clinic";
import { createWhatsAppLink } from "@/lib/whatsapp";

export function ContactSection() {
  return (
    <section id="contacto" className="bg-surface py-24">
      <Container>
        <SectionHeader
          eyebrow="Contacto"
          title="Estamos en El Alto para atenderte"
          description="Coordina tu visita por WhatsApp, llamada o mediante el formulario breve. Evitamos pedir datos médicos sensibles antes de la evaluación."
        />
        <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-border bg-background p-6 shadow-soft">
              <h3 className="font-sora text-2xl font-semibold text-text">{clinic.name}</h3>
              <div className="mt-5 space-y-3 text-sm leading-7 text-muted">
                <p>{clinic.zone}, {clinic.displayAddress}</p>
                <p>{clinic.schedule}</p>
                <p>WhatsApp: {clinic.whatsapp}</p>
                <p>Teléfono secundario: {clinic.phoneSecondary}</p>
                <p>Correo: {clinic.email}</p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button href={createWhatsAppLink("Hola, quiero agendar una valoración.")} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Escribir por WhatsApp
                </Button>
                <Button href={`tel:${clinic.phoneSecondary}`} variant="secondary">
                  <Phone className="mr-2 h-4 w-4" />
                  Llamar ahora
                </Button>
              </div>
            </div>
            <MapSection />
          </div>

          <ContactLeadForm origin="home" />
        </div>
      </Container>
    </section>
  );
}
