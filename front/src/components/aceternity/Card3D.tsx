"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";

const MAX_TILT = 8; // degrees

/** Card that tilts toward the cursor (disabled on touch and reduced motion). */
export function Card3D({ className, children }: { className?: string; children: React.ReactNode }) {
  const { reduced } = useMotionPreference();
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const enabled = canHover && !reduced;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [MAX_TILT, -MAX_TILT]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-MAX_TILT, MAX_TILT]), { stiffness: 200, damping: 20 });

  return (
    <div className={cn("[perspective:1000px]", className)}>
      <motion.div
        onPointerMove={(e) => {
          if (!enabled) return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
        style={enabled ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
