"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import { foundations, skillGroups } from "@/content/skills";
import type { Accent, I18n } from "@/content/types";
import type { Locale } from "@/i18n/routing";
import { revealUp, stagger, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Constellation } from "./Constellation";

const label = (item: string | I18n, locale: Locale) => (typeof item === "string" ? item : item[locale]);

/** Border + glow in the group's own colour when it is highlighted. */
const ACTIVE_STYLE: Record<Accent, string> = {
  violet: "border-violet/60 shadow-[0_0_0_1px_rgb(139_92_246/0.35),0_12px_40px_-10px_rgb(139_92_246/0.6)]",
  cyan: "border-cyan/60 shadow-[0_0_0_1px_rgb(34_211_238/0.35),0_12px_40px_-10px_rgb(34_211_238/0.55)]",
  magenta: "border-magenta/60 shadow-[0_0_0_1px_rgb(224_64_251/0.35),0_12px_40px_-10px_rgb(224_64_251/0.55)]",
};

/**
 * 03 · Constellation — skills. Lists are the accessible source of truth.
 * Hover works both ways: a card lights up its part of the sky, and hovering a
 * part of the constellations highlights its card (the rest dims).
 */
export function Stack() {
  const t = useTranslations("stack");
  const locale = useLocale() as Locale;
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Section id="stack">
      <SectionHeader id="stack" orbit={t("orbit")} title={t("title")} intro={t("intro")} />
      <div className="grid items-center gap-12 lg:grid-cols-12">
        {/* Mobile: small decorative header; desktop: interactive, linked to the lists */}
        <div className="mx-auto w-full max-w-[220px] lg:col-span-5 lg:max-w-none">
          <Constellation highlighted={hovered} onHover={setHovered} />
        </div>
        <motion.div variants={stagger()} initial="hidden" whileInView="visible" viewport={viewportOnce} className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {skillGroups.map((g) => {
            const active = hovered === g.id;
            const dimmed = hovered !== null && !active;
            return (
              // outer layer: entrance animation (motion owns its transform)
              <motion.div key={g.id} variants={revealUp}>
                {/* inner layer: two-way highlight with the constellation */}
                <div
                  onPointerEnter={() => setHovered(g.id)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(g.id)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                  className={cn(
                    "glass h-full rounded-2xl p-5 transition-[transform,opacity,box-shadow,border-color] duration-300 ease-out",
                    active && "-translate-y-1 scale-[1.03]",
                    active && ACTIVE_STYLE[g.accent],
                    dimmed && "opacity-45",
                  )}
                >
                  <h3 className={cn("label-mono mb-4", g.accent === "cyan" ? "text-cyan" : g.accent === "magenta" ? "text-magenta" : "text-violet-soft")}>
                    {g.name[locale]}
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {g.items.map((item) => (
                      <li key={label(item, locale)}>
                        <Tag accent={g.accent}>{label(item, locale)}</Tag>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
          <motion.div variants={revealUp} className="sm:col-span-2">
            <h3 className="label-mono mb-3 text-ink-muted">{t("foundations")}</h3>
            <ul className="flex flex-wrap gap-2">
              {foundations.map((f) => (
                <li key={f.en}>
                  <Tag>{f[locale]}</Tag>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </Section>
  );
}
