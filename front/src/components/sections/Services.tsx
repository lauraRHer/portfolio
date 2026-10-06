"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { BentoGrid } from "@/components/aceternity/BentoGrid";
import { CardSpotlight } from "@/components/aceternity/CardSpotlight";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import { services } from "@/content/services";
import type { Locale } from "@/i18n/routing";
import { revealUp, stagger, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ServiceIllustration } from "./ServiceIllustration";

/** 02 · Missions — what I offer to clients. */
export function Services() {
  const t = useTranslations("services");
  const locale = useLocale() as Locale;

  return (
    <Section id="services">
      <SectionHeader id="services" orbit={t("orbit")} title={t("title")} intro={t("intro")} />
      <motion.div variants={stagger()} initial="hidden" whileInView="visible" viewport={viewportOnce}>
        <BentoGrid>
          {services.map((s, i) => (
            <motion.div key={s.id} variants={revealUp} className={cn(i === 0 && "md:row-span-2", i === 3 && "md:col-span-2")}>
              <CardSpotlight accent={s.accent} className="flex h-full flex-col p-6 md:p-8">
                <ServiceIllustration kind={s.id} tall={i === 0} />
                <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">{s.title[locale]}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{s.description[locale]}</p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {s.tags.map((tag) => (
                    <li key={tag}>
                      <Tag accent={s.accent}>{tag}</Tag>
                    </li>
                  ))}
                </ul>
              </CardSpotlight>
            </motion.div>
          ))}
        </BentoGrid>
      </motion.div>
    </Section>
  );
}
