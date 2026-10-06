"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { siteConfig } from "@/config/site";
import { sections } from "@/content/sections";
import type { Locale } from "@/i18n/routing";
import { CopyEmailButton } from "../ui/CopyEmailButton";
import { LanguageSwitch } from "./LanguageSwitch";

/** Full-screen glass menu for < md. Esc closes, focus is trapped, body scroll locked. */
export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("nav");
  const tc = useTranslations("contact");
  const locale = useLocale() as Locale;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const focusables = panel.current.querySelectorAll<HTMLElement>("a, button");
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={t("openMenu")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col bg-space-950/90 px-6 pb-10 pt-6 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <LanguageSwitch />
            <button type="button" onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-full" aria-label={t("closeMenu")}>
              <X className="size-6" aria-hidden />
            </button>
          </div>

          <nav className="mt-10 flex-1">
            <ol className="space-y-3">
              {sections.map((s, i) => (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06 }}
                >
                  <a href={`#${s.id}`} onClick={onClose} className="flex items-baseline gap-4 font-display text-4xl font-bold tracking-tight">
                    <span className="label-mono text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                    {t(s.key)}
                  </a>
                </motion.li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col gap-3 border-t border-line pt-6 text-ink-soft">
            <CopyEmailButton label={siteConfig.email} copiedLabel={tc("copied")} className="min-h-11" />
            <div className="flex gap-6">
              <a href={siteConfig.socials.linkedin} target="_blank" rel="noopener noreferrer" className="min-h-11 py-3">LinkedIn</a>
              <a href={siteConfig.socials.github} target="_blank" rel="noopener noreferrer" className="min-h-11 py-3">GitHub</a>
              <a href={siteConfig.cv[locale]} download className="inline-flex min-h-11 items-center gap-1.5 py-3">
                <Download className="size-4" aria-hidden /> CV
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
