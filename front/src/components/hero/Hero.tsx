"use client";

import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDeviceTier } from "@/lib/hooks/useDeviceTier";
import { useWebGLSupport } from "@/lib/hooks/useWebGLSupport";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";
import { SCROLL } from "./galaxy/config";
import { GalaxyPoster } from "./GalaxyPoster";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

// three.js lives in its own lazy chunk; never rendered on the server.
const GalaxyScene = dynamic(() => import("./galaxy/GalaxyScene"), { ssr: false });

/**
 * Hero — "Explore a new universe".
 *
 * Layout: a tall section (300vh) with a sticky full-screen stage. The scroll
 * progress across the section (0 → 1) drives the dive into the star:
 *   0.00–0.22  title fades/zooms away
 *   0.08–0.94  camera travels into the target star (GalaxyScene)
 *   0.82–1.00  white-violet flash, then the "core" tint that matches the
 *              background of the next section → seamless hand-off.
 * With reduced motion or without WebGL (hardware acceleration disabled,
 * blocklisted GPU), the hero is a single static screen with an "Enter" link.
 */
export function Hero() {
  const { reduced } = useMotionPreference();
  const webgl = useWebGLSupport();
  return reduced || webgl === false ? <StaticHero /> : <AnimatedHero webgl={webgl === true} />;
}

function StaticHero() {
  const t = useTranslations("hero");
  return (
    <section id="hero" aria-labelledby="hero-title" className="relative h-svh overflow-hidden">
      <GalaxyPoster />
      <HeroTitle eyebrow={t("eyebrow")} title={t("title")} subtitle={null} />
      <div className="absolute inset-x-0 bottom-12 flex justify-center">
        <a href="#core" className="glass rounded-full px-6 py-3 font-mono text-sm uppercase tracking-[0.12em] hover:glow-violet">
          {t("enter")} ↓
        </a>
      </div>
    </section>
  );
}

function AnimatedHero({ webgl }: { webgl: boolean }) {
  const t = useTranslations("hero");
  const tier = useDeviceTier();
  const sectionRef = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  const titleOpacity = useTransform(scrollYProgress, [0, SCROLL.titleFadeEnd], [1, 0]);
  const titleScale = useTransform(scrollYProgress, [0, SCROLL.titleFadeEnd], [1, 1.35]);
  const titleBlur = useTransform(scrollYProgress, [0, SCROLL.titleFadeEnd], ["blur(0px)", "blur(12px)"]);
  const flashOpacity = useTransform(scrollYProgress, [SCROLL.flashStart, SCROLL.flashPeak, 1], [0, 0.9, 0]);
  const coreOpacity = useTransform(scrollYProgress, [SCROLL.coreTintStart, 1], [0, 1]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);

  // Pause the WebGL loop once the galaxy can't be seen: hero scrolled past, or
  // fully covered by the core tint (progress 1) while its last pixels are still
  // on screen — the moment the mascot starts climbing in.
  const updateActive = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;
    setActive(el.getBoundingClientRect().bottom > 0 && scrollYProgress.get() < 1);
  }, [scrollYProgress]);
  useMotionValueEvent(scrollYProgress, "change", updateActive);

  // Also on anchor jumps, which may not emit scroll progress changes.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(updateActive);
    io.observe(el);
    return () => io.disconnect();
  }, [updateActive]);

  return (
    <section ref={sectionRef} id="hero" aria-labelledby="hero-title" className="relative h-[300vh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <GalaxyPoster className={cn("transition-opacity duration-1000", ready && "opacity-0")} />
        {/* Mounted only once WebGL support is confirmed (null during hydration). */}
        {webgl && (
          <SceneErrorBoundary fallback={null}>
            <GalaxyScene progress={scrollYProgress} tier={tier} active={active} onReady={() => setReady(true)} label={t("canvasLabel")} />
          </SceneErrorBoundary>
        )}

        {/* Dark radial scrim so the title is always readable over bright particles */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(5_5_10/0.55)_0%,transparent_60%)]" />

        <motion.div style={{ opacity: titleOpacity, scale: titleScale, filter: titleBlur }} className="pointer-events-none absolute inset-0">
          <HeroTitle eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
        </motion.div>

        <motion.a
          href="#core"
          style={{ opacity: hintOpacity }}
          className="absolute inset-x-0 bottom-8 mx-auto flex w-max flex-col items-center gap-2 text-ink-soft hover:text-ink"
        >
          <span className="label-mono">{t("scroll")}</span>
          <ChevronDown className="size-5 animate-bounce" aria-hidden />
        </motion.a>

        {/* Star-entry: flash, then the "inside the star" tint (matches #core background) */}
        <motion.div
          aria-hidden
          style={{ opacity: flashOpacity }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,#ffffff_0%,#e9d5ff_30%,#8b5cf6_70%,#05050a_100%)]"
        />
        <motion.div aria-hidden style={{ opacity: coreOpacity }} className="core-tint pointer-events-none absolute inset-0" />
      </div>
    </section>
  );
}

function HeroTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
      <p className="label-mono mb-6 text-violet-soft">{eyebrow}</p>
      <h1 id="hero-title" className="display-xl max-w-5xl text-balance text-glow">
        {title.split(" ").map((word, i, arr) =>
          i === arr.length - 1 ? (
            <span key={i} className="text-gradient">
              {word}
            </span>
          ) : (
            <span key={i}>{word} </span>
          ),
        )}
      </h1>
      {subtitle && <p className="mt-6 max-w-md text-balance text-ink-soft">{subtitle}</p>}
    </div>
  );
}
