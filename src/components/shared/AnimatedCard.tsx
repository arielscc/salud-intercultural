"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 }
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

export function AnimatedCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "rounded-3xl border border-border bg-surface p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-lift",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
