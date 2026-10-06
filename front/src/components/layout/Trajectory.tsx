"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useTranslations } from "next-intl";
import { sections } from "@/content/sections";
import { usePastHero } from "@/lib/hooks/usePastHero";
import { useScrollSpy } from "@/lib/hooks/useScrollSpy";
import { cn } from "@/lib/utils";

const ids = sections.map((s) => s.id);

/**
 * Scroll progress "trajectory":
 * vertical line with one dot per orbit on desktop, thin top bar on mobile.
 */
export function Trajectory() {
  const t = useTranslations("nav");
  const pastHero = usePastHero();
  const active = useScrollSpy(ids);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <>
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className={cn("fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-[linear-gradient(90deg,#8b5cf6,#e040fb,#22d3ee)] transition-opacity lg:hidden", !pastHero && "opacity-0")}
      />
      <nav
        aria-label={t("progress")}
        className={cn("fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 transition-opacity duration-500 lg:block", pastHero ? "opacity-100" : "pointer-events-none opacity-0")}
      >
        <div aria-hidden className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-line">
          <motion.div style={{ scaleY: progress }} className="h-full w-full origin-top bg-[linear-gradient(180deg,#8b5cf6,#e040fb,#22d3ee)]" />
        </div>
        <ol className="relative flex flex-col gap-6">
          {sections.map((s) => (
            <li key={s.id} className="group relative flex items-center justify-center">
              <a
                href={`#${s.id}`}
                aria-label={t(s.key)}
                aria-current={active === s.id ? "location" : undefined}
                className={cn(
                  "block size-2.5 rounded-full border transition-all",
                  active === s.id ? "scale-125 border-cyan bg-cyan shadow-[0_0_10px_2px_rgb(34_211_238/0.6)]" : "border-ink-muted bg-space-950 hover:border-ink",
                )}
              />
              <span className="label-mono pointer-events-none absolute right-6 whitespace-nowrap rounded bg-space-800 px-2 py-1 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {t(s.key)}
              </span>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
