"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { accentHex, constellations, type ConstellationId, type PostSummary } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { backgroundDust, constellationLabel, layoutStars, MAP_H, MAP_W, wrapLabel, type Star } from "@/lib/blog/starmap";
import { cn } from "@/lib/utils";
import { formatPostDate } from "./format";

type Props = {
  posts: PostSummary[];
  /** "full": titled stars that open a card. "compact": unlabelled stars that link to the post. */
  variant: "full" | "compact";
  active?: string | null;
  filter?: ConstellationId | "all";
  onSelect?: (slug: string) => void;
  onHover?: (slug: string | null) => void;
  className?: string;
};

const dust = backgroundDust(90);

/** Blog index drawn as a sky: every star is a post, constellations are topics. */
export function StarMap({ posts, variant, active, filter = "all", onSelect, onHover, className }: Props) {
  const t = useTranslations("blog");
  const locale = useLocale();
  const stars = useMemo(() => layoutStars(posts), [posts]);
  const full = variant === "full";

  // Stars grouped by constellation, in publication order.
  const groups = useMemo(() => {
    const map = new Map<ConstellationId, Star[]>();
    for (const s of [...stars].reverse()) map.set(s.constellation, [...(map.get(s.constellation) ?? []), s]);
    return [...map];
  }, [stars]);
  const edges = groups.filter(([, g]) => g.length > 1);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-line bg-space-950", className)}>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgb(139_92_246/0.18),transparent_65%)]" />
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="relative block h-auto w-full" role="group" aria-label={t("mapLabel")}>
        <g aria-hidden>
          {dust.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#fff" opacity={d.o} />
          ))}
          {edges.map(([c, g]) => (
            <polyline
              key={c}
              points={g.map((s) => `${s.x},${s.y}`).join(" ")}
              fill="none"
              stroke={accentHex[constellations[c].accent]}
              strokeWidth={1.2}
              strokeOpacity={filter === "all" || filter === c ? 0.4 : 0.08}
              className="transition-[stroke-opacity] duration-300"
            />
          ))}
          {full &&
            groups.map(([c, g]) => {
              const label = constellationLabel(g);
              return (
                <text
                  key={c}
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  fill={accentHex[constellations[c].accent]}
                  opacity={filter === "all" || filter === c ? 0.85 : 0.25}
                  className="font-mono text-[13px] uppercase tracking-[0.2em] max-md:hidden"
                >
                  {t(`constellations.${c}`)}
                </text>
              );
            })}
        </g>

        {stars.map((s) => {
          const color = accentHex[constellations[s.constellation].accent];
          const isActive = active === s.slug;
          const dimmed = filter !== "all" && filter !== s.constellation;
          const labelRight = s.x < MAP_W * 0.68;
          const lines = wrapLabel(s.title);
          const tx = labelRight ? s.x + s.r + 14 : s.x - s.r - 14;
          const anchor = labelRight ? "start" : "end";
          const date = `${formatPostDate(s.date, locale).toUpperCase()} · ${s.readingMinutes} MIN`;

          return (
            <Link
              key={s.slug}
              href={`/blog/${s.slug}`}
              data-star={s.slug}
              aria-label={`${s.title} · ${formatPostDate(s.date, locale)}`}
              aria-current={isActive ? "true" : undefined}
              onClick={(e) => {
                if (!onSelect) return;
                e.preventDefault();
                onSelect(s.slug);
              }}
              onMouseEnter={() => onHover?.(s.slug)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(s.slug)}
              onBlur={() => onHover?.(null)}
              className={cn("group outline-none transition-opacity duration-300", dimmed && "opacity-30")}
            >
              <circle cx={s.x} cy={s.y} r={s.r * 2.8} fill={color} opacity={0.5 - s.age * 0.35} className="star-halo" />
              <circle
                cx={s.x}
                cy={s.y}
                r={s.r + 8}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                className={cn("opacity-0 transition-opacity group-focus-visible:opacity-100", isActive && "opacity-100")}
              />
              <circle cx={s.x} cy={s.y} r={s.r} fill="#f2f2f7" opacity={1 - s.age * 0.45} />
              {/* Generous hit area */}
              <circle cx={s.x} cy={s.y} r={22} fill="transparent" />
              {full && (
                <g className="pointer-events-none max-md:hidden">
                  {lines.map((line, i) => (
                    <text
                      key={i}
                      x={tx}
                      y={s.y - 2 + i * 19}
                      textAnchor={anchor}
                      className={cn(
                        "font-sans text-[16px] transition-colors",
                        isActive ? "fill-ink" : "fill-ink-soft group-hover:fill-ink group-focus-visible:fill-ink",
                      )}
                    >
                      {line}
                    </text>
                  ))}
                  <text x={tx} y={s.y + 16 + (lines.length - 1) * 19} textAnchor={anchor} className="fill-ink-muted font-mono text-[11px] tracking-[0.08em]">
                    {date}
                  </text>
                </g>
              )}
            </Link>
          );
        })}
      </svg>
    </div>
  );
}

/** Star position as fractions of the map, used to place the card. */
export function starPosition(posts: PostSummary[], slug: string): { x: number; y: number } | null {
  const s = layoutStars(posts).find((p) => p.slug === slug);
  return s ? { x: s.x / MAP_W, y: s.y / MAP_H } : null;
}
