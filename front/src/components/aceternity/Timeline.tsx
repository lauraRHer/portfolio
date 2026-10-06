"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export type TimelineItem = {
  id: string;
  /** Sticky label on the left (dates). */
  label: React.ReactNode;
  content: React.ReactNode;
  /** Hollow node (e.g. education). */
  hollow?: boolean;
};

/**
 * Vertical timeline whose line fills with a gradient as you scroll,
 * with a glowing "probe" at the fill head. Rendered as an <ol>.
 */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 50%"] });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <ol ref={ref} className={cn("relative", className)}>
      {/* track + fill */}
      <div aria-hidden className="absolute bottom-0 left-[11px] top-2 w-px bg-line md:left-[calc(25%+11px)]">
        <motion.div style={{ height }} className="relative w-full bg-[linear-gradient(to_bottom,#8b5cf6,#e040fb,#22d3ee)]">
          <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-cyan shadow-[0_0_12px_4px_rgb(34_211_238/0.6)]" />
        </motion.div>
      </div>

      {items.map((item) => (
        <li key={item.id} className="relative grid gap-3 pb-16 pl-10 last:pb-0 md:grid-cols-4 md:gap-10 md:pl-0">
          <div className="md:sticky md:top-28 md:self-start md:pr-10 md:text-right">
            <span className="label-mono text-ink-muted">{item.label}</span>
          </div>
          <span
            aria-hidden
            className={cn(
              "absolute left-[5px] top-1 size-[13px] rounded-full border-2 border-violet md:left-[calc(25%+5px)]",
              item.hollow ? "bg-space-950" : "bg-violet shadow-[0_0_14px_2px_rgb(139_92_246/0.6)]",
            )}
          />
          <div className="md:col-span-3 md:pl-10">{item.content}</div>
        </li>
      ))}
    </ol>
  );
}
