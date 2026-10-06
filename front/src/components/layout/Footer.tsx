"use client";

import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";
import { LanguageSwitch } from "./LanguageSwitch";

export function Footer() {
  const t = useTranslations("footer");
  const { userOverride, toggle } = useMotionPreference();

  return (
    <footer className="border-t border-line bg-space-950">
      <div className="container-page flex flex-col gap-6 py-10 text-sm text-ink-muted lg:flex-row lg:items-center lg:justify-between">
        <p>© {new Date().getFullYear()} {siteConfig.name}</p>
        <div className="max-w-md space-y-1 text-pretty">
          <p>{t("madeWith")}</p>
          {/* CC BY 4.0 requires crediting the mascot model's source and licence */}
          <p className="text-xs">
            {t.rich("mascotCredit", {
              meshy: (chunks) => <a href="https://www.meshy.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">{chunks}</a>,
              license: (chunks) => <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap underline hover:text-ink">{chunks}</a>,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <LanguageSwitch />
          <button type="button" onClick={toggle} aria-pressed={userOverride} className="min-h-8 hover:text-ink">
            {userOverride ? t("enableMotion") : t("reduceMotion")}
          </button>
          <a href="#core" className="hover:text-ink">{t("backToTop")}</a>
          <a href="#hero" className="hover:text-ink">{t("seeGalaxy")}</a>
        </div>
      </div>
    </footer>
  );
}
