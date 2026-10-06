"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** ES | EN switch. Keeps the current scroll position and hash. */
export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div role="group" aria-label={t("language")} className={cn("flex items-center gap-1 font-mono text-xs", className)}>
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="text-ink-muted">|</span>}
          <button
            type="button"
            lang={l}
            aria-current={l === locale ? "true" : undefined}
            onClick={() => router.replace(`${pathname}${window.location.hash}`, { locale: l, scroll: false })}
            className={cn(
              "min-h-8 min-w-8 rounded px-1 uppercase tracking-[0.12em] transition-colors",
              l === locale ? "text-ink" : "text-ink-muted hover:text-ink-soft",
            )}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}
