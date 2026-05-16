"use client";

import { motion } from "framer-motion";
import { CalendarCheck, HandHeart, MapPin, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { fadeUp, staggerContainer } from "@/components/shared/AnimatedCard";

const benefits = [
  { title: "Atención humana y personalizada", text: "Escucha activa y orientación según cada caso.", icon: HandHeart },
  { title: "Enfoque natural e integrativo", text: "Unimos terapias complementarias y prevención.", icon: ShieldCheck },
  { title: "Seguimiento según cada caso", text: "Acompañamiento para mantener claridad durante el proceso.", icon: CalendarCheck },
  { title: "Comunicación por WhatsApp", text: "Canal directo para consultas y coordinación.", icon: MessageCircle },
  { title: "Ubicación accesible", text: "Estamos en Cruce Villa Adela, El Alto.", icon: MapPin },
  { title: "Orientación educativa", text: "Información clara para tomar mejores decisiones.", icon: Users }
];

export function BenefitsSection() {
  return (
    <section className="bg-gradient-to-b from-surface to-background py-24">
      <Container>
        <SectionHeader eyebrow="Beneficios" title="¿Por qué elegir Salud Intercultural?" />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.18 }}
          className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {benefits.map((benefit) => (
            <motion.div
              key={benefit.title}
              variants={fadeUp}
              className="group rounded-3xl border border-border bg-surface p-6 shadow-soft transition hover:-translate-y-1 hover:border-primary/25"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-soft text-primary transition group-hover:bg-primary group-hover:text-white">
                <benefit.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-sora text-lg font-semibold text-text">{benefit.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{benefit.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
