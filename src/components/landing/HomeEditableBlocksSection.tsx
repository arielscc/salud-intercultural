"use client";

import { Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import { Container } from "@/components/shared/Container";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { homeContent } from "@/data/home";
import { cardReveal, motionViewport, staggerContainer } from "@/lib/motion";
import type { PublicHomeContent } from "@/lib/cms/public-content";

type HomeEditableBlocksSectionProps = {
  content?: PublicHomeContent;
};

export function HomeEditableBlocksSection({
  content = homeContent
}: HomeEditableBlocksSectionProps) {
  return (
    <section className="premium-gradient-soft py-20 sm:py-24">
      <Container>
        <SectionHeader
          eyebrow="Preparado para CMS"
          title="Bloques listos para administración de contenido"
          description="La V2 organiza la home en bloques reemplazables por contenido administrable, sin cambiar la experiencia pública."
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={motionViewport}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          {content.editableBlocks.map((block) => (
            <motion.div key={block.title} variants={cardReveal}>
              <PremiumCard className="h-full">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Settings2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-sora text-xl font-semibold text-text">
                  {block.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {block.description}
                </p>
              </PremiumCard>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
