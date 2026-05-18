"use client";

import { Quote, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Container } from "@/components/shared/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { featuredTestimonials as fallbackFeaturedTestimonials } from "@/data/testimonials";
import { cardReveal, motionViewport, staggerContainer } from "@/lib/motion";
import type { Testimonial } from "@/types/landing";

type TestimonialsSectionProps = {
  testimonials?: Testimonial[];
};

export function TestimonialsSection({
  testimonials = fallbackFeaturedTestimonials
}: TestimonialsSectionProps) {
  return (
    <section id="testimonios" className="bg-surface py-24">
      <Container>
        <SectionHeader
          eyebrow="Testimonios"
          title="Pacientes que confiaron en nuestra atención"
          description="Testimonios de muestra preparados para reemplazarse por experiencias reales autorizadas."
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={motionViewport}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          {testimonials.map((testimonial) => (
            <motion.article
              key={testimonial.id}
              variants={cardReveal}
              className="rounded-3xl border border-border bg-background p-6 shadow-soft"
            >
              <Quote className="h-8 w-8 text-primary" aria-hidden="true" />
              <div className="mt-5 flex gap-1 text-accent" aria-label="Valoración positiva">
                {Array.from({ length: testimonial.rating ?? 5 }).map((_, starIndex) => (
                  <Star key={starIndex} className="h-4 w-4 fill-current" aria-hidden="true" />
                ))}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">
                {testimonial.treatmentType}
              </p>
              <p className="mt-5 text-base leading-8 text-text">“{testimonial.quote}”</p>
              <p className="mt-5 text-sm font-semibold text-muted">— {testimonial.author}</p>
            </motion.article>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
