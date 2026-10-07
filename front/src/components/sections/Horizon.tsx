"use client";

import { motion } from "motion/react";
import { Award, ExternalLink, GraduationCap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CardSpotlight } from "@/components/aceternity/CardSpotlight";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import { credentials } from "@/content/education";
import type { Locale } from "@/i18n/routing";
import { revealUp, stagger, viewportOnce } from "@/lib/motion";

type RoadItem = { tag: "now" | "next"; text: string };

/** 07 · Horizon — education, certifications and the road to AI. */
export function Horizon() {
  const t = useTranslations("horizon");
  const locale = useLocale() as Locale;
  const road = t.raw("road") as RoadItem[];

  return (
    <Section id="learning">
      <SectionHeader id="learning" orbit={t("orbit")} title={t("title")} intro={t("intro")} />
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <h3 className="label-mono mb-6 text-ink-muted">{t("educationTitle")}</h3>
          <motion.ul variants={stagger()} initial="hidden" whileInView="visible" viewport={viewportOnce} className="space-y-4">
            {credentials.map((c) => {
              const Icon = c.kind === "degree" ? GraduationCap : Award;
              return (
                <motion.li key={c.id} variants={revealUp}>
                  <CardSpotlight className="flex gap-4 p-5">
                    <Icon className="mt-1 size-5 shrink-0 text-violet-soft" aria-hidden />
                    <div>
                      <p className="font-semibold leading-snug">{c.title[locale]}</p>
                      <p className="mt-1 text-sm text-ink-soft">{c.issuer} · {c.year}</p>
                      <p className="mt-2 text-sm text-ink-muted">{c.description[locale]}</p>
                      {c.credentialUrl && (
                        <a href={c.credentialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-cyan hover:underline">
                          {t("viewCredential")} <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      )}
                    </div>
                  </CardSpotlight>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>

        <div className="relative">
          <div aria-hidden className="absolute -top-10 left-0 h-40 w-full bg-[radial-gradient(ellipse_at_top,rgb(34_211_238/0.18),transparent_70%)]" />
          <h3 className="label-mono relative mb-6 text-cyan">{t("roadTitle")}</h3>
          <motion.ol variants={stagger()} initial="hidden" whileInView="visible" viewport={viewportOnce} className="relative space-y-5">
            {road.map((r) => (
              <motion.li key={r.text} variants={revealUp} className="flex items-start gap-4">
                <Tag accent={r.tag === "now" ? "cyan" : "magenta"} className="mt-0.5 shrink-0">
                  {t(r.tag)}
                </Tag>
                <p className="text-lg leading-relaxed text-ink">{r.text}</p>
              </motion.li>
            ))}
          </motion.ol>
          <motion.p variants={revealUp} initial="hidden" whileInView="visible" viewport={viewportOnce} className="mt-10 border-l-2 border-violet pl-5 font-display text-xl text-ink text-pretty">
            {t("closing")}
          </motion.p>
        </div>
      </div>
    </Section>
  );
}
