"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { HandHeart, Leaf, Sparkles } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { imagePlaceholder, publicImageSizes } from "@/lib/images";

export function AboutSection() {
  return (
    <section id="nosotros" className="overflow-hidden py-24">
      <Container className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-surface shadow-soft">
            <Image
              src="https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=1100&q=85"
              alt="Plantas medicinales y elementos naturales usados con enfoque responsable"
              fill
              placeholder="blur"
              blurDataURL={imagePlaceholder}
              sizes={publicImageSizes.aboutFeature}
              className="object-cover"
            />
          </div>
          <div className="glass absolute -bottom-6 left-5 right-5 rounded-3xl p-5">
            <p className="font-sora text-xl font-semibold text-text">Salud integral</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Bienestar completo del cuerpo, mente y espíritu con respeto por cada persona.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionHeader
            align="left"
            eyebrow="Nosotros"
            title="Una clínica que integra ciencia, naturaleza y sabiduría ancestral"
          />
          <div className="mt-6 space-y-5 text-base leading-8 text-muted">
            <p>
              Salud Intercultural es una clínica de medicina natural, tradicional e integrativa ubicada en El Alto, Bolivia. Nuestro enfoque combina orientación médica, terapias naturales y acompañamiento personalizado para apoyar el bienestar del paciente.
            </p>
            <p>
              Creemos que la salud debe atenderse de forma humana, preventiva e integral, respetando las raíces culturales y uniendo saberes modernos con la sabiduría ancestral andina.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Salud",
                text: "Bienestar completo del cuerpo, mente y espíritu.",
                icon: Leaf
              },
              {
                title: "Intercultural",
                text: "Respeto, igualdad y unión de saberes para atender con dignidad.",
                icon: Sparkles
              }
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
                <item.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-sora text-lg font-semibold text-text">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-3xl border border-primary/15 bg-surface-soft p-5">
            <HandHeart className="h-6 w-6 shrink-0 text-primary" />
            <p className="text-sm leading-6 text-primary-dark">
              Acompañamos con comunicación responsable, sin promesas absolutas y con evaluación individual.
            </p>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
