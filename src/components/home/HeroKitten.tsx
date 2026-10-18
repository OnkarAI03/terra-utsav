"use client";

import { motion } from "framer-motion";

/**
 * Koochu Puchu drifts in from the left. Only transform is animated, never opacity, so the image
 * is visible (and counts for LCP) from the first paint even before this script runs.
 */
export function HeroKitten({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="relative mx-auto -mb-2 w-[min(78vw,440px)] lg:mx-0 lg:mb-0 lg:w-full lg:max-w-[560px] lg:translate-y-14 lg:self-end"
      initial={{ x: -48, rotate: -5 }}
      animate={{ x: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 16, mass: 1 }}
    >
      {children}
    </motion.div>
  );
}
