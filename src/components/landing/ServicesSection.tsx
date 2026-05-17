"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedCard, staggerContainer } from "@/components/shared/AnimatedCard";
import { Container } from "@/components/shared/Container";
import { Icon } from "@/components/shared/Icon";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { homeContent } from "@/data/home";
import { services as fallbackServices } from "@/data/services";
import { createWhatsAppLink } from "@/lib/whatsapp";
import type { PublicHomeContent } from "@/lib/cms/public-content";
import type { Service } from "@/types/landing";

type ServicesSectionProps = {
  content?: PublicHomeContent;
  services?: Service[];
};

export function ServicesSection({
  content = homeContent,
  services = fallbackServices
}: ServicesSectionProps) {
  const activeServices = services.filter((service) => service.active);
  const featuredServices = content.featuredServiceSlugs
    .map((slug) => activeServices.find((service) => service.slug === slug))
    .filter((service): service is Service => Boolean(service));
  const visibleServices = featuredServices.length
    ? featuredServices
    : activeServices.filter((service) => service.featured).slice(0, 6);

  return (
    <section id="servicios" className="bg-surface py-24">
      <Container>
        <SectionHeader
          eyebrow="Servicios"
          title="Servicios destacados de la clínica"
          description="Selección inicial preparada para administrarse desde CMS y orientar la conversión hacia consulta."
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {visibleServices.map((service) => (
            <AnimatedCard key={service.slug} className="flex min-h-[360px] flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon name={service.icon} className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  Complementario
                </span>
              </div>
              <h3 className="mt-5 font-sora text-xl font-semibold text-text">{service.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{service.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {service.benefits.map((benefit) => (
                  <span key={benefit} className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-primary-dark">
                    {benefit}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Relacionado
              </p>
              <p className="mt-2 text-sm text-text">{service.relatedProblems.join(" · ")}</p>
              <a
                href={createWhatsAppLink(service.whatsappMessage)}
                target="_blank"
                rel="noreferrer"
                className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-primary-dark hover:text-primary"
              >
                Consultar por WhatsApp
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </AnimatedCard>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
