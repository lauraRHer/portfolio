import { constellations, type ConstellationId, type PostSummary } from "@/content/blog";

/** Map drawing space (SVG viewBox). The map scales uniformly with its width. */
export const MAP_W = 1000;
export const MAP_H = 520;

export type Star = PostSummary & {
  /** Position in viewBox units. */
  x: number;
  y: number;
  /** 0 = newest post, 1 = oldest. Drives brightness. */
  age: number;
  /** Core radius, from reading time. */
  r: number;
};

const MARGIN_X = 70;
const MARGIN_Y = 50;
const GOLDEN_ANGLE = 2.39996;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/**
 * Lays stars out around their constellation's anchor on a golden-angle
 * spiral, oldest first, so adding a post never moves the existing ones.
 * A post can pin its own position with `star: [x, y]` in post.yaml.
 */
export function layoutStars(posts: PostSummary[]): Star[] {
  const byDate = [...posts].sort((a, b) => a.date.localeCompare(b.date));
  const total = Math.max(1, byDate.length - 1);
  const indexIn: Partial<Record<ConstellationId, number>> = {};

  return byDate
    .map((p, i) => {
      const n = (indexIn[p.constellation] = (indexIn[p.constellation] ?? -1) + 1);
      const [ax, ay] = constellations[p.constellation].anchor;
      let x: number, y: number;
      if (p.star) {
        [x, y] = [p.star[0] * MAP_W, p.star[1] * MAP_H];
      } else {
        const angle = n * GOLDEN_ANGLE + hash(p.constellation) * Math.PI * 2;
        const radius = n === 0 ? 0 : 60 + 48 * Math.sqrt(n);
        x = ax * MAP_W + Math.cos(angle) * radius * 1.5;
        y = ay * MAP_H + Math.sin(angle) * radius;
      }
      return {
        ...p,
        x: Math.min(MAP_W - MARGIN_X, Math.max(MARGIN_X, x)),
        y: Math.min(MAP_H - MARGIN_Y, Math.max(MARGIN_Y, y)),
        age: byDate.length === 1 ? 0 : (byDate.length - 1 - i) / total,
        r: 4 + Math.min(p.readingMinutes, 15) * 0.55,
      };
    })
    .reverse();
}

/** Deterministic background dust (mulberry32, so it doesn't form streaks). */
export function backgroundDust(count: number): { x: number; y: number; r: number; o: number }[] {
  let seed = 0x9e3779b9;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => ({ x: rand() * MAP_W, y: rand() * MAP_H, r: 0.4 + rand() * 1.1, o: 0.08 + rand() * 0.35 }));
}

/** Where to write a constellation's name: above its highest star, or below its lowest one. */
export function constellationLabel(stars: Star[]): { x: number; y: number } {
  const xs = stars.map((s) => s.x);
  const top = Math.min(...stars.map((s) => s.y - s.r));
  const bottom = Math.max(...stars.map((s) => s.y + s.r));
  const x = Math.min(MAP_W - 90, Math.max(90, (Math.min(...xs) + Math.max(...xs)) / 2));
  return { x, y: top - 34 >= 24 ? top - 34 : Math.min(MAP_H - 14, bottom + 62) };
}

/** Splits a title into at most two lines of ~`max` characters for SVG labels. */
export function wrapLabel(title: string, max = 28): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of title.split(/\s+/)) {
    if (current && (current + " " + word).length > max) {
      lines.push(current);
      current = word;
    } else current = current ? `${current} ${word}` : word;
  }
  if (current) lines.push(current);
  if (lines.length <= 2) return lines;
  return [lines[0], `${lines[1].replace(/[.,:;]$/, "")}…`];
}
