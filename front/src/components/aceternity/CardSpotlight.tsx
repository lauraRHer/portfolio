"use client";

import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { cn } from "@/lib/utils";

const COLORS = {
  violet: "139,92,246",
  cyan: "34,211,238",
  magenta: "224,64,251",
} as const;

type Props = React.HTMLAttributes<HTMLDivElement> & {
  accent?: keyof typeof COLORS;
  radius?: number;
};

/** Glass card with a radial glow that follows the cursor. */
export function CardSpotlight({ accent = "violet", radius = 320, className, children, ...props }: Props) {
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${x}px ${y}px, rgba(${COLORS[accent]},0.16), transparent 70%)`;

  return (
    <div
      {...props}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left);
        y.set(e.clientY - rect.top);
      }}
      onPointerLeave={() => {
        x.set(-1000);
        y.set(-1000);
      }}
      className={cn("glass group relative overflow-hidden rounded-2xl transition-colors hover:border-line-strong", className)}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background }} />
      <div className="relative">{children}</div>
    </div>
  );
}
