"use client";

import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { accentHex, constellations, type PostSummary } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatPostDate } from "./format";

/** One post as a text row: date, title, excerpt, topic. Hover/focus lights its star. */
export function PostRow({
  post: p,
  active,
  onHover,
  headingLevel: H = "h3",
}: {
  post: PostSummary;
  active?: boolean;
  onHover?: (slug: string | null) => void;
  headingLevel?: "h2" | "h3";
}) {
  const t = useTranslations("blog");
  const locale = useLocale();
  const color = accentHex[constellations[p.constellation].accent];

  return (
    <Link
      href={`/blog/${p.slug}`}
      onMouseEnter={() => onHover?.(p.slug)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(p.slug)}
      onBlur={() => onHover?.(null)}
      className={cn(
        "group grid gap-x-5 gap-y-1 rounded-xl px-3 py-5 transition-colors sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-baseline",
        active ? "bg-violet/[0.08]" : "hover:bg-violet/[0.06]",
      )}
    >
      <span className="font-mono text-xs tracking-wide text-ink-muted tabular-nums">
        <time dateTime={p.date}>{formatPostDate(p.date, locale)}</time>
        <span className="sm:block"> · {t("minutes", { n: p.readingMinutes })}</span>
      </span>
      <span className="min-w-0">
        <H className="font-display text-lg font-bold leading-snug tracking-tight text-balance md:text-xl">{p.title}</H>
        <span className="mt-1 block text-ink-soft text-pretty">{p.excerpt}</span>
        <span className="label-mono mt-2 inline-flex items-center gap-2" style={{ color }}>
          <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
          {t(`constellations.${p.constellation}`)}
          {p.draft && <span className="rounded border border-warning/40 px-1.5 text-warning">{t("draft")}</span>}
        </span>
      </span>
      <span aria-hidden className="hidden items-center gap-1 text-sm text-cyan sm:inline-flex">
        {t("read")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
