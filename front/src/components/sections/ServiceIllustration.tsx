"use client";

import { motion } from "motion/react";
import type { Service } from "@/content/types";
import { cn } from "@/lib/utils";

/** Tiny animated header illustration per service card (SVG + motion, no canvas). */
export function ServiceIllustration({ kind, tall }: { kind: Service["id"]; tall?: boolean }) {
  return (
    <div aria-hidden className={cn("relative overflow-hidden rounded-xl border border-line bg-space-950/60", tall ? "h-56 md:h-72" : "h-36")}>
      {kind === "ai" && <AgentNodes />}
      {kind === "web" && <Wireframe />}
      {kind === "maps" && <MapPins />}
      {kind === "api" && <JsonLines />}
    </div>
  );
}

function AgentNodes() {
  const nodes = [
    { x: 40, y: 50 },
    { x: 120, y: 25 },
    { x: 120, y: 75 },
    { x: 200, y: 50 },
    { x: 270, y: 50 },
  ];
  const edges: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]];
  return (
    <svg viewBox="0 0 310 100" className="absolute inset-0 h-full w-full p-4">
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="#22d3ee" strokeOpacity="0.6" strokeWidth="1"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 + i * 0.2 }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="9" fill="#0a0a14" stroke={i === 4 ? "#34d399" : "#22d3ee"} />
          <circle cx={n.x} cy={n.y} r="3" fill={i === 4 ? "#34d399" : "#22d3ee"} className="animate-pulse-dot" style={{ animationDelay: `${i * 0.25}s` }} />
        </g>
      ))}
    </svg>
  );
}

function Wireframe() {
  return (
    <div className="absolute inset-4 flex flex-col gap-2">
      <div className="flex gap-1.5">
        {["#f87171", "#fbbf24", "#34d399"].map((c) => <span key={c} className="size-2 rounded-full" style={{ background: c }} />)}
      </div>
      <div className="h-3 w-1/2 rounded bg-violet/30" />
      <div className="grid flex-1 grid-cols-3 gap-2">
        <div className="rounded bg-white/5" />
        <div className="col-span-2 rounded bg-white/5 p-2">
          <div className="h-2 w-3/4 rounded bg-white/10" />
          <div className="mt-2 flex items-center gap-1">
            <div className="h-2 w-1/3 rounded bg-white/10" />
            <span className="h-3 w-px animate-blink bg-violet-soft" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Map with a route and pins dropping in (maps & data-visualisation service). */
function MapPins() {
  const pins = [
    { x: 70, y: 62, c: "#e040fb" },
    { x: 150, y: 38, c: "#22d3ee" },
    { x: 230, y: 70, c: "#a78bfa" },
  ];
  return (
    <svg viewBox="0 0 300 110" className="absolute inset-0 h-full w-full p-3">
      {/* faint grid + land shapes */}
      {[22, 44, 66, 88].map((y) => (
        <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="rgb(255 255 255 / 0.05)" />
      ))}
      <path d="M10 80 Q60 40 110 70 T210 50 T295 75 L295 110 L10 110 Z" fill="rgb(139 92 246 / 0.12)" />
      <motion.path
        d="M70 62 C100 30 120 30 150 38 S210 90 230 70"
        fill="none"
        stroke="#22d3ee"
        strokeOpacity="0.7"
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
      {pins.map((p, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 + i * 0.3, type: "spring", stiffness: 300, damping: 15 }}
        >
          <path d={`M${p.x} ${p.y} c-7 -9 -7 -16 0 -18 c7 2 7 9 0 18 Z`} fill={p.c} />
          <circle cx={p.x} cy={p.y - 12} r="2.4" fill="#0a0a14" />
        </motion.g>
      ))}
    </svg>
  );
}

function JsonLines() {
  return (
    <pre className="absolute inset-4 overflow-hidden font-mono text-xs leading-relaxed text-ink-soft">
      <span className="text-cyan">POST</span> /api/chat{"\n"}
      {"{"}{"\n"}
      {"  "}<span className="text-violet-soft">&quot;status&quot;</span>: <span className="text-success">200</span>,{"\n"}
      {"  "}<span className="text-violet-soft">&quot;stream&quot;</span>: <span className="text-magenta">true</span>{"\n"}
      {"}"}
    </pre>
  );
}
