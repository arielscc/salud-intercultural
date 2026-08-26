"use client";

import { CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type ActionSuccessOverlayProps = {
  open: boolean;
  title: string;
  description: string;
};

export function ActionSuccessOverlay({
  open,
  title,
  description
}: ActionSuccessOverlayProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center bg-text/20 px-5 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-live="polite"
          role="status"
        >
          <motion.div
            className="w-full max-w-[22rem] rounded-[14px] border border-success/25 bg-surface px-6 py-7 text-center shadow-[0_24px_70px_rgba(11,44,54,0.22)]"
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 330, damping: 26 }}
          >
            <motion.div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success ring-8 ring-success/5"
              initial={{ scale: 0.72 }}
              animate={{ scale: [0.72, 1.08, 1] }}
              transition={{ duration: 0.42, ease: "easeOut" }}
            >
              <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
            </motion.div>
            <motion.h2
              className="mt-4 font-sora text-xl font-bold text-text"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              {title}
            </motion.h2>
            <motion.p
              className="mt-1.5 text-sm leading-6 text-muted"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              {description}
            </motion.p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
