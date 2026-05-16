"use client";

import { Quote, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Container } from "@/components/shared/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { featuredTestimonials } from "@/data/testimonials";

export function TestimonialsSection() {
  return (
    <section id="testimonios" className="bg-surface py-24">
      <Container>
        <SectionHeader
          eyebrow="Testimonios"
          title="Pacientes que confiaron en nuestra atención"
          description="Testimonios de muestra preparados para reemplazarse por experiencias reales autorizadas."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {featuredTestimonials.map((testimonial, index) => (
            <motion.article
              key={testimonial.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="rounded-3xl border border-border bg-background p-6 shadow-soft"
            >
              <Quote className="h-8 w-8 text-primary" />
              <div className="mt-5 flex gap-1 text-accent" aria-label="Valoración positiva">
                {Array.from({ length: testimonial.rating ?? 5 }).map((_, starIndex) => (
                  <Star key={starIndex} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">
                {testimonial.treatmentType}
              </p>
              <p className="mt-5 text-base leading-8 text-text">“{testimonial.quote}”</p>
              <p className="mt-5 text-sm font-semibold text-muted">— {testimonial.author}</p>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}
