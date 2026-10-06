"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { GithubIcon as Github } from "@/components/ui/BrandIcons";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Card3D } from "@/components/aceternity/Card3D";
import { Meteors } from "@/components/aceternity/Meteors";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import { sortedProjects } from "@/content/projects";
import type { Project, ProjectCategory } from "@/content/types";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const FILTERS: ("all" | ProjectCategory)[] = ["all", "ai", "web", "backend"];

/** 06 · Systems — data-driven project grid. */
export function Projects() {
  const t = useTranslations("projects");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const visible = useMemo(
    () => (filter === "all" ? sortedProjects : sortedProjects.filter((p) => p.categories.includes(filter))),
    [filter],
  );

  return (
    <Section id="projects">
      <SectionHeader id="projects" orbit={t("orbit")} title={t("title")} intro={t("intro")} />

      <div role="toolbar" aria-label={t("filterLabel")} className="mb-10 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "min-h-10 rounded-full border px-4 font-mono text-xs uppercase tracking-[0.12em] transition-colors",
              filter === f ? "border-violet bg-violet/15 text-ink" : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
            )}
          >
            {t(`filters.${f}`)}
          </button>
        ))}
      </div>

      <motion.ul layout className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((p) => (
            <motion.li
              key={p.slug}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className={cn(p.featured && "md:col-span-2")}
            >
              <ProjectCard project={p} />
            </motion.li>
          ))}
          <motion.li key="next-system" layout className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center text-ink-muted">
            <span className="flex items-center gap-3 font-mono text-sm">
              <span className="size-2 animate-pulse-dot rounded-full bg-violet" />
              {t("nextSystem")}
            </span>
          </motion.li>
        </AnimatePresence>
      </motion.ul>
    </Section>
  );
}

const accentGradient = {
  violet: "from-violet/40 via-violet/10",
  cyan: "from-cyan/35 via-cyan/10",
  magenta: "from-magenta/35 via-magenta/10",
};

function ProjectCard({ project: p }: { project: Project }) {
  const t = useTranslations("projects");
  const locale = useLocale() as Locale;
  const isExample = p.status === "example";

  return (
    <Card3D className="h-full">
      <article className="glass group relative flex h-full flex-col overflow-hidden rounded-2xl transition-colors hover:border-line-strong">
        {p.featured && <Meteors />}
        {/* Cover: generated gradient "planet" until real screenshots exist */}
        <div aria-hidden className={cn("relative h-40 overflow-hidden bg-gradient-to-br to-transparent", accentGradient[p.accent ?? "violet"], p.featured && "md:h-52")}>
          <div className="absolute -bottom-16 -right-10 size-48 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgb(255_255_255/0.35),transparent_60%)] ring-1 ring-white/10" />
          <span className="absolute bottom-4 left-5 font-mono text-xs text-white/60">{[p.year, p.stack.slice(0, 2).join(" / ")].filter(Boolean).join(" · ")}</span>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="mb-3 flex flex-wrap gap-2">
            {isExample && <Tag accent="magenta">{t("exampleBadge")}</Tag>}
            {p.status === "in-progress" && <Tag accent="magenta">{t("inProgressBadge")}</Tag>}
            {p.context === "personal" && <Tag>{t("personalBadge")}</Tag>}
            {p.featured && <Tag accent="cyan">{t("featured")}</Tag>}
            {p.organization && <Tag>{p.organization}</Tag>}
          </div>
          <h3 className="font-display text-xl font-bold tracking-tight md:text-2xl">{p.title[locale]}</h3>
          <p className="mt-2 flex-1 leading-relaxed text-ink-soft">{p.summary[locale]}</p>
          <ul className="mt-5 flex flex-wrap gap-1.5">
            {p.stack.map((s) => (
              <li key={s}><Tag>{s}</Tag></li>
            ))}
          </ul>
          {isExample && <p className="mt-4 text-xs text-ink-muted">{t("exampleNote")}</p>}
          <ProjectLinks project={p} />
        </div>
      </article>
    </Card3D>
  );
}

function ProjectLinks({ project: p }: { project: Project }) {
  const t = useTranslations("projects");
  const links = p.links ?? {};
  if (!links.demo && !links.caseStudy && (!links.repo || p.confidential)) return null;
  const cls = "inline-flex min-h-10 items-center gap-1.5 text-sm text-cyan hover:underline";
  return (
    <div className="mt-5 flex flex-wrap gap-5 border-t border-line pt-4">
      {links.caseStudy && <a href={links.caseStudy} className={cls}>{t("links.caseStudy")} <ArrowUpRight className="size-4" aria-hidden /></a>}
      {links.demo && <a href={links.demo} target="_blank" rel="noopener noreferrer" className={cls}>{t("links.demo")} <ArrowUpRight className="size-4" aria-hidden /></a>}
      {links.repo && !p.confidential && <a href={links.repo} target="_blank" rel="noopener noreferrer" className={cls}><Github className="size-4" aria-hidden /> {t("links.repo")}</a>}
    </div>
  );
}
