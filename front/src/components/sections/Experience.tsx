"use client";

import { ArrowDown } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Timeline } from "@/components/aceternity/Timeline";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import { experience } from "@/content/experience";
import type { Locale } from "@/i18n/routing";

/** 04 · Trajectory — experience timeline. */
export function Experience() {
  const t = useTranslations("experience");
  const locale = useLocale() as Locale;
  const format = useFormatter();

  const fmt = (ym: string) => format.dateTime(new Date(`${ym}-01T00:00:00`), { month: "short", year: "numeric" });

  const items = experience.map((e) => ({
    id: e.id,
    hollow: e.kind === "education",
    label: (
      <>
        {fmt(e.start)} – {e.end ? fmt(e.end) : t("present")}
      </>
    ),
    content: (
      <article>
        {e.kind === "education" && <Tag className="mb-3">{t("education")}</Tag>}
        <h3 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{e.role[locale]}</h3>
        <p className="mt-1 text-ink-soft">
          <span className="text-violet-soft">{e.organization}</span> · {e.location[locale]}
        </p>
        {e.summary && <p className="mt-4 max-w-[65ch] leading-relaxed text-ink-soft">{e.summary[locale]}</p>}
        {e.bullets && (
          <ul className="mt-4 max-w-[68ch] space-y-2.5 leading-relaxed text-ink-soft">
            {e.bullets[locale].map((b) => (
              <li key={b} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:size-1.5 before:rounded-full before:bg-violet/70">
                {b}
              </li>
            ))}
          </ul>
        )}
        {e.link && (
          <a href={e.link} className="mt-5 inline-flex items-center gap-1.5 text-sm text-cyan hover:underline">
            {t("caseLink")} <ArrowDown className="size-4" aria-hidden />
          </a>
        )}
      </article>
    ),
  }));

  return (
    <Section id="experience">
      <SectionHeader id="experience" orbit={t("orbit")} title={t("title")} intro={t("intro")} />
      <Timeline items={items} />
    </Section>
  );
}
