"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { cardReveal } from "@/lib/motion";

export function AnimatedCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={cardReveal}
      className={cn(
        "premium-card premium-card-interactive",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
