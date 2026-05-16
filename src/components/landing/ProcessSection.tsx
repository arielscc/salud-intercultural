"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { createWhatsAppLink } from "@/lib/whatsapp";

const steps = [
  ["Escríbenos por WhatsApp", "Cuéntanos brevemente qué problema deseas consultar."],
  ["Agenda tu valoración", "Te orientamos para coordinar una visita a la clínica."],
  ["Recibe evaluación personalizada", "El profesional revisa tu caso y define la mejor orientación."],
  ["Inicia tu acompañamiento", "Recibes seguimiento, indicaciones y terapias según corresponda."]
];

export function ProcessSection() {
  return (
    <section className="py-24">
      <Container>
        <SectionHeader eyebrow="Proceso" title="Tu camino hacia una atención más integral" />
        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {steps.map(([title, text], index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              className="relative rounded-3xl border border-border bg-surface p-6 shadow-soft"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-5 font-sora text-lg font-semibold text-text">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button href={createWhatsAppLink("Hola, quiero agendar una valoración.")} target="_blank" rel="noreferrer">
            Agendar una valoración
          </Button>
        </div>
      </Container>
    </section>
  );
}
