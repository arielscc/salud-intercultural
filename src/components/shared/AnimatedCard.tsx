"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { fadeUp } from "@/lib/motion";

export { fadeUp, staggerContainer } from "@/lib/motion";

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
        "premium-card premium-card-interactive",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
