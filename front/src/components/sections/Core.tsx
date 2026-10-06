"use client";

import { motion } from "motion/react";
import { ArrowRight, Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AuroraBackground } from "@/components/aceternity/AuroraBackground";
import { CardSpotlight } from "@/components/aceternity/CardSpotlight";
import { FlipWords } from "@/components/aceternity/FlipWords";
import { MovingBorderLink } from "@/components/aceternity/MovingBorder";
import { Sparkles } from "@/components/aceternity/Sparkles";
import { TextGenerateEffect } from "@/components/aceternity/TextGenerateEffect";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { revealUp, stagger, viewportOnce } from "@/lib/motion";

/**
 * 01 · Core — "arrival" inside the star.
 * Its background (`core-tint`) matches the end of the hero dive.
 */
export function Core() {
  const t = useTranslations("core");
  const locale = useLocale() as Locale;
  const isMobile = useMediaQuery("(max-width: 767px)");

  const facts = [
    { label: t("facts.experienceLabel"), value: t("facts.experience") },
    { label: t("facts.baseLabel"), value: t("facts.base") },
    { label: t("facts.focusLabel"), value: t("facts.focus") },
    { label: t("facts.stackLabel"), value: t("facts.stack") },
  ];

  return (
    <section id="core" aria-labelledby="core-title" className="core-tint relative flex min-h-svh items-center overflow-hidden py-28">
      <AuroraBackground />
      <Sparkles density={isMobile ? 15 : 40} />
      <OrbitRings />

      <div className="container-page relative grid items-center gap-14 lg:grid-cols-12">
        <motion.div variants={stagger(0.1)} initial="hidden" whileInView="visible" viewport={viewportOnce} className="lg:col-span-7">
          <motion.p variants={revealUp} className="label-mono mb-4 text-violet-soft">{t("orbit")}</motion.p>
          <motion.p variants={revealUp} className="mb-6 font-mono text-sm text-cyan">{t("microline")}</motion.p>
          <motion.h2 variants={revealUp} id="core-title" className="display-xl text-glow">
            {t("title")}
          </motion.h2>
          <motion.p variants={revealUp} className="mt-6 font-display text-2xl font-medium text-ink md:text-3xl">
            <TextGenerateEffect words={t("role")} />
          </motion.p>
          <motion.p variants={revealUp} className="mt-3 font-display text-xl text-ink-soft md:text-2xl">
            {t("flipPrefix")} <FlipWords words={t.raw("flipWords") as string[]} className="text-gradient font-bold" />
          </motion.p>
          <motion.p variants={revealUp} className="mt-8 max-w-[62ch] text-lg leading-relaxed text-ink-soft text-pretty">
            {t("paragraph")}
          </motion.p>
          <motion.div variants={revealUp} className="mt-10 flex flex-wrap items-center gap-4">
            <MovingBorderLink href={siteConfig.cv[locale]} download>
              <Download className="size-4" aria-hidden />
              {t("ctaCv")}
            </MovingBorderLink>
            <a href="#contact" className="group inline-flex items-center gap-2 rounded-full px-5 py-3 text-ink-soft transition-colors hover:text-ink">
              {t("ctaTalk")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
          </motion.div>
        </motion.div>

        <motion.div variants={revealUp} initial="hidden" whileInView="visible" viewport={viewportOnce} className="lg:col-span-5">
          <CardSpotlight className="p-6 md:p-8">
            <dl className="grid grid-cols-2 gap-6 lg:grid-cols-1">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="label-mono text-ink-muted">{f.label}</dt>
                  <dd className="mt-1 font-display text-lg font-medium text-ink md:text-xl">{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 flex items-center gap-3 border-t border-line pt-6 text-sm text-ink-soft">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
              {t("availability")}
            </p>
          </CardSpotlight>
        </motion.div>
      </div>
    </section>
  );
}

/** Faint concentric orbit rings, slowly rotating (desktop only). */
function OrbitRings() {
  return (
    <svg aria-hidden viewBox="0 0 800 800" className="pointer-events-none absolute -right-40 top-1/2 hidden h-[900px] w-[900px] -translate-y-1/2 animate-spin-slow opacity-60 lg:block">
      {[180, 270, 360].map((r) => (
        <circle key={r} cx="400" cy="400" r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" />
      ))}
      <circle cx="580" cy="400" r="3" fill="#a78bfa" />
      <circle cx="400" cy="130" r="2" fill="#22d3ee" />
      <circle cx="40" cy="400" r="2.5" fill="#e040fb" />
    </svg>
  );
}
