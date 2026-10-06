"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Download, Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { siteConfig } from "@/config/site";
import { sections } from "@/content/sections";
import type { Locale } from "@/i18n/routing";
import { usePastHero } from "@/lib/hooks/usePastHero";
import { useScrollSpy } from "@/lib/hooks/useScrollSpy";
import { cn } from "@/lib/utils";
import { LanguageSwitch } from "./LanguageSwitch";
import { MobileMenu } from "./MobileMenu";

const sectionIds = sections.map((s) => s.id);

/**
 * Top navigation.
 * - During the hero: only "Skip intro" + language switch (top-right).
 * - After entering the star: glass pill nav that hides on scroll down
 *   and reappears on scroll up.
 */
export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pastHero = usePastHero();
  const active = useScrollSpy(sectionIds);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (Math.abs(y - prev) < 6) return;
    setHidden(y > prev && y - prev > 0);
  });

  return (
    <>
      {/* Hero cluster */}
      <AnimatePresence>
        {!pastHero && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed right-4 top-4 z-50 flex items-center gap-4 md:right-8 md:top-6"
          >
            <a href="#core" className="label-mono rounded-full px-3 py-2 text-ink-soft transition-colors hover:text-ink">
              {t("skipIntro")} →
            </a>
            <LanguageSwitch />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main nav */}
      <motion.header
        initial={false}
        animate={pastHero && !hidden ? { y: 0, opacity: 1 } : { y: -96, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onFocusCapture={() => setHidden(false)}
        className={cn("fixed inset-x-0 top-4 z-50 px-4", !pastHero && "pointer-events-none")}
        aria-hidden={!pastHero}
        inert={!pastHero}
      >
        <nav aria-label="Main" className="glass mx-auto flex h-14 max-w-4xl items-center justify-between rounded-full pl-5 pr-2 elevation">
          <a href="#core" className="font-display text-lg font-bold tracking-tight hover:text-gradient" aria-label={t("home")}>
            {siteConfig.shortName}
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {sections
              .filter((s) => s.inNav)
              .map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={active === s.id ? "location" : undefined}
                    className={cn(
                      "relative rounded-full px-3 py-2 text-sm transition-colors",
                      active === s.id ? "text-ink" : "text-ink-soft hover:text-ink",
                    )}
                  >
                    {t(s.key)}
                    {active === s.id && (
                      <motion.span layoutId="nav-dot" className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-violet" />
                    )}
                  </a>
                </li>
              ))}
          </ul>

          <div className="flex items-center gap-2">
            <LanguageSwitch className="hidden sm:flex" />
            <a
              href={siteConfig.cv[locale]}
              download
              className="hidden items-center gap-1.5 rounded-full bg-violet px-4 py-2 text-sm font-medium text-white transition-shadow hover:glow-violet sm:inline-flex"
            >
              <Download className="size-4" aria-hidden />
              {t("cv")}
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex size-11 items-center justify-center rounded-full text-ink-soft hover:text-ink md:hidden"
              aria-label={t("openMenu")}
              aria-expanded={menuOpen}
            >
              <Menu className="size-5" aria-hidden />
            </button>
          </div>
        </nav>
      </motion.header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
