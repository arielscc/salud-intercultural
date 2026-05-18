"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/shared/Container";
import { homeContent } from "@/data/home";
import { cardReveal, motionViewport, staggerContainer } from "@/lib/motion";
import type { PublicHomeContent } from "@/lib/cms/public-content";

type HomeStatsSectionProps = {
  content?: PublicHomeContent;
};

export function HomeStatsSection({ content = homeContent }: HomeStatsSectionProps) {
  return (
    <section className="bg-surface py-12">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={motionViewport}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {content.stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={cardReveal}
              className="rounded-[1.5rem] border border-border bg-background p-5 text-center shadow-soft"
            >
              <p className="font-sora text-3xl font-semibold text-primary-dark">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-muted">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
