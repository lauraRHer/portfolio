"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useTranslations } from "next-intl";
import type { Heading } from "@/content/blog";
import { useScrollSpy } from "@/lib/hooks/useScrollSpy";
import { cn } from "@/lib/utils";

/** The home "trajectory", repurposed: one dot per `##` heading + reading progress. */
export function ArticleToc({ headings }: { headings: Heading[] }) {
  const t = useTranslations("blog");
  const active = useScrollSpy(headings.map((h) => h.id));
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <>
      <motion.div aria-hidden style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-[linear-gradient(90deg,#8b5cf6,#e040fb,#22d3ee)] lg:hidden" />
      {headings.length > 1 && (
        <nav aria-label={t("toc")} className="sticky top-28 hidden lg:block">
          <p className="label-mono mb-5 text-ink-muted">{t("toc")}</p>
          <div className="relative pl-6">
            <div aria-hidden className="absolute bottom-1 left-[4px] top-1 w-px bg-line">
              <motion.div style={{ scaleY: progress }} className="h-full w-full origin-top bg-[linear-gradient(180deg,#8b5cf6,#e040fb,#22d3ee)]" />
            </div>
            <ol className="flex flex-col gap-5">
              {headings.map((h) => (
                <li key={h.id} className="relative">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -left-6 top-1.5 block size-2.5 rounded-full border transition-all",
                      active === h.id ? "border-cyan bg-cyan shadow-[0_0_10px_2px_rgb(34_211_238/0.6)]" : "border-ink-muted bg-space-950",
                    )}
                  />
                  <a
                    href={`#${h.id}`}
                    aria-current={active === h.id ? "location" : undefined}
                    className={cn("block text-sm leading-snug transition-colors", active === h.id ? "text-ink" : "text-ink-muted hover:text-ink-soft")}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
      )}
    </>
  );
}
