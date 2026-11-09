"use client";

import { MotionConfig } from "framer-motion";

export function Providers({ children }: { children: React.ReactNode }) {
  // reducedMotion="user": respeta "reducir movimiento" del sistema operativo
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
