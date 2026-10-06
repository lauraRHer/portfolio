"use client";

import { motion } from "motion/react";
import { revealUp, stagger, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  /** Section id; the h2 gets `${id}-title` for aria-labelledby. */
  id: string;
  /** Orbit eyebrow, e.g. "Órbita 01 · Núcleo" — metaphor lives here. */
  orbit: string;
  /** Plain, scannable heading — clarity lives here. */
  title: string;
  intro?: string;
  className?: string;
  align?: "left" | "center";
};

/** Shared header for every section ("metaphor in labels, clarity in headings"). */
export function SectionHeader({ id, orbit, title, intro, className, align = "left" }: Props) {
  return (
    <motion.header
      variants={stagger(0.08)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className={cn("mb-14 md:mb-20", align === "center" && "mx-auto text-center", className)}
    >
      <motion.p variants={revealUp} className={cn("label-mono mb-5 flex items-center gap-3 text-violet-soft", align === "center" && "justify-center")}>
        <OrbitIcon />
        <span aria-hidden className="h-px w-6 bg-violet-soft/60" />
        {orbit}
      </motion.p>
      <motion.h2 variants={revealUp} id={`${id}-title`} className="display-lg text-balance">
        {title}
      </motion.h2>
      {intro && (
        <motion.p variants={revealUp} className={cn("mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft text-pretty", align === "center" && "mx-auto")}>
          {intro}
        </motion.p>
      )}
    </motion.header>
  );
}

function OrbitIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 animate-spin-slow">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.5" />
      <circle cx="14" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}
