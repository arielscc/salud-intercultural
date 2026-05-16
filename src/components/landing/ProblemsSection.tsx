"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedCard, staggerContainer } from "@/components/shared/AnimatedCard";
import { Container } from "@/components/shared/Container";
import { Icon } from "@/components/shared/Icon";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { problems } from "@/data/problems";
import { createWhatsAppLink } from "@/lib/whatsapp";

export function ProblemsSection() {
  return (
    <section id="tratamientos" className="py-24">
      <Container>
        <SectionHeader
          eyebrow="Tratamientos"
          title="Problemas que atendemos con enfoque integral"
          description="Acompañamos casos frecuentes con evaluación, orientación natural y seguimiento personalizado, siempre con comunicación responsable."
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.18 }}
          className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {problems.map((problem) => (
            <AnimatedCard key={problem.title}>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-soft text-primary">
                <Icon name={problem.icon} className="h-6 w-6" />
              </div>
              <p className="mt-5 text-sm font-semibold text-primary">{problem.title}</p>
              <h3 className="mt-2 font-sora text-xl font-semibold leading-7 text-text">
                {problem.headline}
              </h3>
              <p className="mt-3 min-h-20 text-sm leading-7 text-muted">{problem.description}</p>
              <a
                href={createWhatsAppLink(problem.whatsappMessage)}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-dark hover:text-primary"
              >
                {problem.cta}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </AnimatedCard>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
