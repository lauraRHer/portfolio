"use client";

import { motion } from "motion/react";
import { useLocale } from "next-intl";
import { skillGroups } from "@/content/skills";
import type { Locale } from "@/i18n/routing";

/**
 * Decorative sky map: Ursa Major (Osa Mayor) and Ursa Minor (Osa Menor).
 * Each skill group lights up one part of the two constellations when
 * hovered in the list next to it:
 *   frontend → Big Dipper handle · backend → Big Dipper bowl
 *   ai       → Little Dipper handle, ending in Polaris (the North Star)
 *   quality  → Little Dipper bowl
 * The dashed "pointer" line (Merak → Dubhe → Polaris) is how Polaris is
 * found in the real sky — it starts at the backend bowl and leads to the AI,
 * just like the real stack. When a part is lit, a tooltip shows the name of its
 * skill group (useful on mobile, where the cards may be off screen).
 * aria-hidden: the lists carry the information.
 */

type Star = { x: number; y: number; mag: 1 | 2 | 3 };

// Real layout of both constellations (traced from a star chart, scaled to the
// 420×420 box). Merak → Dubhe extended ~5× lands on Polaris, as in the sky.
const STARS = {
  // Ursa Major (Big Dipper)
  dubhe: { x: 325, y: 307, mag: 1 },
  merak: { x: 340, y: 363, mag: 2 },
  phecda: { x: 264, y: 402, mag: 2 },
  megrez: { x: 230, y: 366, mag: 3 },
  alioth: { x: 170, y: 370, mag: 1 },
  mizar: { x: 123, y: 366, mag: 2 },
  alkaid: { x: 60, y: 402, mag: 2 },
  // Ursa Minor (Little Dipper)
  polaris: { x: 251, y: 28, mag: 1 },
  yildun: { x: 214, y: 36, mag: 3 },
  epsilon: { x: 174, y: 56, mag: 3 },
  zeta: { x: 148, y: 100, mag: 3 },
  eta: { x: 118, y: 91, mag: 3 },
  pherkad: { x: 107, y: 150, mag: 2 },
  kochab: { x: 140, y: 150, mag: 1 },
} satisfies Record<string, Star>;

type StarId = keyof typeof STARS;

const PARTS: { group: string; color: string; path: StarId[] }[] = [
  { group: "frontend", color: "#a78bfa", path: ["megrez", "alioth", "mizar", "alkaid"] },
  { group: "backend", color: "#a78bfa", path: ["megrez", "dubhe", "merak", "phecda", "megrez"] },
  { group: "ai", color: "#22d3ee", path: ["polaris", "yildun", "epsilon", "zeta"] },
  { group: "quality", color: "#e040fb", path: ["zeta", "eta", "pherkad", "kochab", "zeta"] },
];

const RADIUS = { 1: 3.6, 2: 2.8, 3: 2.1 } as const;

/** Where each group's tooltip sits (picked by hand to avoid covering the lines). */
const TOOLTIP_AT: Record<string, { x: number; y: number }> = {
  frontend: { x: 140, y: 336 },
  backend: { x: 280, y: 346 },
  ai: { x: 222, y: 92 },
  quality: { x: 128, y: 174 },
};

const toPath = (ids: StarId[]) => ids.map((id, i) => `${i ? "L" : "M"}${STARS[id].x} ${STARS[id].y}`).join(" ");

type Props = {
  highlighted: string | null;
  /** Hovering a part of the sky highlights its skill card (two-way link). */
  onHover?: (group: string | null) => void;
};

export function Constellation({ highlighted, onHover }: Props) {
  const locale = useLocale() as Locale;
  const colorOf = (id: StarId) => PARTS.find((p) => p.path.includes(id) && (highlighted === null || p.group === highlighted))?.color;
  const isLit = (id: StarId) => highlighted === null || PARTS.some((p) => p.group === highlighted && p.path.includes(id));

  return (
    <svg aria-hidden viewBox="0 0 420 420" className="mx-auto w-full max-w-md">
      {/* pointer stars → Polaris */}
      <motion.path
        d={`M${STARS.merak.x} ${STARS.merak.y} L${STARS.dubhe.x} ${STARS.dubhe.y} L${STARS.polaris.x} ${STARS.polaris.y + 8}`}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={highlighted === "ai" || highlighted === "backend" ? 0.4 : 0.14}
        strokeWidth={1}
        strokeDasharray="3 6"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay: 0.6 }}
        style={{ transition: "stroke-opacity .3s" }}
      />

      {/* constellation lines */}
      {PARTS.map((p) => {
        const on = highlighted === null || highlighted === p.group;
        return (
          <motion.path
            key={p.group}
            d={toPath(p.path)}
            fill="none"
            stroke={p.color}
            strokeOpacity={on ? 0.55 : 0.12}
            strokeWidth={on && highlighted ? 1.4 : 1}
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            animate={highlighted === p.group ? { pathLength: [0, 1] } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            style={{ transition: "stroke-opacity .3s" }}
          />
        );
      })}

      {/* stars: size by brightness, halo in the colour of their group */}
      {(Object.keys(STARS) as StarId[]).map((id) => {
        const s = STARS[id];
        const lit = isLit(id);
        const color = colorOf(id) ?? "#a78bfa";
        const big = lit && highlighted !== null;
        return (
          <g key={id} style={{ opacity: lit ? 1 : 0.3, transition: "opacity .3s" }}>
            <circle cx={s.x} cy={s.y} r={(big ? 11 : 7) + (3 - s.mag)} fill={color} opacity={0.16} style={{ transition: "r .3s" }} />
            <circle cx={s.x} cy={s.y} r={RADIUS[s.mag]} fill="#fff" />
          </g>
        );
      })}

      {/* Polaris gets its little sparkle */}
      <g opacity={highlighted === null || highlighted === "ai" ? 1 : 0.3} style={{ transition: "opacity .3s" }}>
        <path
          d={`M${STARS.polaris.x} ${STARS.polaris.y - 13} L${STARS.polaris.x} ${STARS.polaris.y + 13} M${STARS.polaris.x - 13} ${STARS.polaris.y} L${STARS.polaris.x + 13} ${STARS.polaris.y}`}
          stroke="#22d3ee"
          strokeOpacity={0.7}
          strokeWidth={1}
          strokeLinecap="round"
        />
      </g>

      {/* hover targets: wide invisible strokes (and the bowls' inside) per part */}
      {onHover &&
        PARTS.map((p) => {
          const closed = p.path[0] === p.path[p.path.length - 1];
          return (
            <path
              key={`hit-${p.group}`}
              d={toPath(p.path)}
              fill={closed ? "transparent" : "none"}
              stroke="transparent"
              strokeWidth={26}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents={closed ? "all" : "stroke"}
              // mouse: hover; touch/pen: tap to show / hide (no hover there)
              onPointerEnter={(e) => e.pointerType === "mouse" && onHover(p.group)}
              onPointerLeave={(e) => e.pointerType === "mouse" && onHover(null)}
              onPointerUp={(e) => e.pointerType !== "mouse" && onHover(highlighted === p.group ? null : p.group)}
            />
          );
        })}

      {/* Polaris label */}
      <text x={STARS.polaris.x + 18} y={STARS.polaris.y + 4} className="pointer-events-none fill-cyan font-mono" fontSize="10" letterSpacing="1.5">
        POLARIS
      </text>

      {/* tooltip with the name of the lit skill group */}
      {PARTS.map((p) => {
        if (highlighted !== p.group) return null;
        const name = skillGroups.find((g) => g.id === p.group)?.name[locale] ?? p.group;
        const at = TOOLTIP_AT[p.group];
        const w = name.length * 7.2 + 20;
        return (
          <motion.g
            key={`tip-${p.group}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none"
          >
            <rect x={at.x - w / 2} y={at.y - 12} width={w} height={24} rx={7} fill="#12121f" stroke={p.color} strokeOpacity={0.7} />
            <text x={at.x} y={at.y + 4} textAnchor="middle" fill={p.color} fontSize="12" fontWeight="600" className="font-mono">
              {name}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}
