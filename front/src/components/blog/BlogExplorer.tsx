"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { constellationIds, accentHex, constellations, type ConstellationId, type PostSummary } from "@/content/blog";
import { cn } from "@/lib/utils";
import { PostRow } from "./PostRow";
import { StarCard } from "./StarCard";
import { StarMap, starPosition } from "./StarMap";

type Filter = ConstellationId | "all";

/** /blog: star map + card + always-visible list, sharing one selection. */
export function BlogExplorer({ posts }: { posts: PostSummary[] }) {
  const t = useTranslations("blog");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const present = constellationIds.filter((c) => posts.some((p) => p.constellation === c));
  const visible = useMemo(() => (filter === "all" ? posts : posts.filter((p) => p.constellation === filter)), [filter, posts]);
  const selectedPost = posts.find((p) => p.slug === selected) ?? null;
  const anchor = selected ? starPosition(posts, selected) : null;

  const close = useCallback(() => {
    const slug = selected;
    setSelected(null);
    if (slug) mapRef.current?.querySelector<SVGElement>(`[data-star="${slug}"]`)?.focus();
  }, [selected]);

  const pickFilter = (f: Filter) => {
    setFilter(f);
    if (f !== "all" && selectedPost && selectedPost.constellation !== f) setSelected(null);
  };

  return (
    <div>
      {present.length > 1 && (
        <div role="toolbar" aria-label={t("filterLabel")} className="mb-6 flex flex-wrap gap-2">
          {(["all", ...present] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => pickFilter(f)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 font-mono text-xs uppercase tracking-[0.12em] transition-colors",
                filter === f ? "border-violet bg-violet/15 text-ink" : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
              )}
            >
              {f !== "all" && <span aria-hidden className="size-1.5 rounded-full" style={{ background: accentHex[constellations[f].accent] }} />}
              {f === "all" ? t("all") : t(`constellations.${f}`)}
            </button>
          ))}
        </div>
      )}

      <div ref={mapRef} className="relative">
        <StarMap posts={posts} variant="full" active={hovered ?? selected} filter={filter} onSelect={setSelected} onHover={setHovered} />
        {selectedPost && anchor && <StarCard key={selectedPost.slug} post={selectedPost} anchor={anchor} onClose={close} />}
      </div>
      <p className="flex flex-wrap gap-x-6 gap-y-1 border-b border-line px-1 py-3 font-mono text-xs text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="size-2 rounded-full bg-ink" />
          {t("legend.star")}
        </span>
        <span>{t("legend.size")}</span>
        <span>{t("legend.brightness")}</span>
        <span className="max-md:hidden">{t("legend.lines")}</span>
      </p>

      <div className="mt-14 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight">{t("allPosts")}</h2>
        <span className="label-mono text-ink-muted">{t("count", { n: visible.length, total: posts.length })}</span>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {visible.map((p) => (
          <li key={p.slug}>
            <PostRow post={p} active={(hovered ?? selected) === p.slug} onHover={setHovered} />
          </li>
        ))}
      </ul>
    </div>
  );
}
