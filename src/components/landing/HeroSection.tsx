"use client";

import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { clinic } from "@/data/clinic";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { motion } from "framer-motion";
import { CalendarCheck, MapPin, Phone, ShieldCheck } from "lucide-react";
import Image from "next/image";

export function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-hero-radial pt-28 premium-grid"
    >
      <Container className="grid min-h-[760px] items-center gap-12 pb-20 pt-10 lg:grid-cols-[1.02fr_0.98fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-wrap gap-2">
            <Badge>Atención integral</Badge>
            <Badge>Enfoque natural e intercultural</Badge>
            <Badge>Ubicados en El Alto</Badge>
          </div>
          <h1 className="mt-7 max-w-4xl font-sora text-4xl font-semibold leading-[1.05] tracking-normal text-text sm:text-5xl lg:text-6xl">
            Medicina natural y tradicional para cuidar tu salud de forma
            integral
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            En Salud Intercultural combinamos orientación médica, terapias
            naturales y sabiduría ancestral andina para acompañarte con una
            atención humana, preventiva y personalizada.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              href={createWhatsAppLink("Hola, quiero agendar una valoración.")}
              target="_blank"
              rel="noreferrer"
            >
              Solicitar valoración por WhatsApp
            </Button>
            <Button href={`tel:${clinic.phoneSecondary}`} variant="secondary">
              <Phone className="mr-2 h-4 w-4" />
              Llamar ahora
            </Button>
          </div>
          <p className="mt-5 flex max-w-xl items-center gap-2 text-sm text-muted">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Cada tratamiento se orienta según una evaluación individual.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-surface shadow-lift">
            <Image
              src="https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1200&q=85"
              alt="Profesional de salud conversando con una paciente en consulta"
              fill
              priority
              sizes="(min-width: 1024px) 46vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-dark/72 to-transparent p-7 text-white">
              <p className="font-sora text-2xl font-semibold">
                Soluciones reales, no parches.
              </p>
              <p className="mt-2 text-sm text-white/86">
                Atención humana, preventiva y complementaria.
              </p>
            </div>
          </div>
          <div className="glass absolute bottom-32 left-3 right-3 rounded-3xl p-5 sm:left-auto sm:right-6 sm:w-80">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-soft text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-text">Cruce Villa Adela</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {clinic.displayAddress}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface/75 p-3">
              <CalendarCheck className="h-5 w-5 text-accent" />
              <p className="text-sm font-semibold text-text">
                {clinic.schedule}
              </p>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
