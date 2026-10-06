"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Cone of light opening from a glowing line (heading backdrop). */
export function Lamp({ className, color = "#22d3ee" }: { className?: string; color?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 flex h-80 justify-center overflow-hidden", className)}>
      <motion.div
        initial={{ opacity: 0.4, width: "12rem" }}
        whileInView={{ opacity: 1, width: "32rem" }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.9, ease: "easeInOut" }}
        className="absolute top-0 h-56 max-w-full"
        style={{ background: `radial-gradient(ellipse at top, ${color}55, transparent 70%)` }}
      />
      <motion.div
        initial={{ width: "8rem" }}
        whileInView={{ width: "24rem" }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.9, ease: "easeInOut" }}
        className="absolute top-0 h-px max-w-full"
        style={{ background: color, boxShadow: `0 0 24px 4px ${color}` }}
      />
    </div>
  );
}
