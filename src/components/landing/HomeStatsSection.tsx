"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/shared/Container";
import { homeContent } from "@/data/home";
import { fadeUp, staggerContainer } from "@/lib/motion";

export function HomeStatsSection() {
  return (
    <section className="bg-surface py-12">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {homeContent.stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
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
