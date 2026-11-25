"use client";

import { ArrowRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { type PostSummary } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatPostDate } from "./format";

const GAP = 26;
const EDGE = 12;

/**
 * Card for the selected star. Opens right below it (above when the star is
 * near the bottom), points at it, closes with × or Esc and hands focus back.
 * Below md it sits under the map instead, where stars have no labels.
 */
export function StarCard({
  post,
  anchor,
  onClose,
}: {
  post: PostSummary;
  /** Star position as fractions of the map. */
  anchor: { x: number; y: number };
  onClose: () => void;
}) {
  const t = useTranslations("blog");
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number; cw: number; ch: number } | null>(null);

  // Measure the map and the card to place it in pixels.
  useLayoutEffect(() => {
    const card = ref.current;
    const map = card?.parentElement;
    if (!card || !map) return;
    const measure = () => setBox({ w: map.clientWidth, h: map.clientHeight, cw: card.offsetWidth, ch: card.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(map);
    ro.observe(card);
    return () => ro.disconnect();
  }, [post.slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  let style: React.CSSProperties | undefined;
  let below = true;
  let arrow = 0;
  if (box) {
    const sx = anchor.x * box.w;
    const sy = anchor.y * box.h;
    const left = Math.min(Math.max(EDGE, sx - box.cw / 2), box.w - box.cw - EDGE);
    below = sy + GAP + box.ch <= box.h - EDGE;
    const top = below ? sy + GAP : sy - GAP - box.ch;
    arrow = Math.min(Math.max(18, sx - left), box.cw - 18);
    style = { left, top: Math.max(EDGE, top) };
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label={post.title}
      style={style}
      className={cn(
        "z-10 flex flex-col gap-2 rounded-2xl border border-cyan/40 bg-space-950/95 p-5 pr-12 elevation backdrop-blur",
        "max-md:relative max-md:mt-3 md:absolute md:w-[20rem]",
        !box && "md:invisible",
      )}
    >
      <span
        aria-hidden
        style={{ left: arrow }}
        className={cn(
          "absolute hidden size-3 -translate-x-1/2 rotate-45 border-cyan/40 bg-space-950 md:block",
          below ? "-top-[7px] border-l border-t" : "-bottom-[7px] border-b border-r",
        )}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label={t("closeCard")}
        className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
      >
        <X className="size-4" aria-hidden />
      </button>
      <span className="label-mono text-cyan">
        {t(`constellations.${post.constellation}`)} · {formatPostDate(post.date, locale)} · {t("minutes", { n: post.readingMinutes })}
      </span>
      <span className="font-display text-lg font-bold leading-snug tracking-tight">{post.title}</span>
      <span className="text-sm text-ink-soft">{post.excerpt}</span>
      <Link
        href={`/blog/${post.slug}`}
        className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-violet px-4 py-2 text-sm font-medium text-white transition-shadow hover:glow-violet"
      >
        {t("readArticle")} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
