"use client";

import { MotionConfig } from "framer-motion";

/** Every Framer Motion animation on the site follows the visitor's reduced-motion setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
