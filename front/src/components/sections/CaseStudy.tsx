"use client";

import { motion, useInView } from "motion/react";
import { Braces, Camera, ScanEye, ScanText, Tags, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BackgroundBeams } from "@/components/aceternity/BackgroundBeams";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import { revealUp, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Block = { title: string; body: string };
type Node = { title: string; detail: string };

const ICONS: LucideIcon[] = [Camera, ScanEye, Tags, ScanText, Braces];

/**
 * Which pipeline nodes light up for each narrative block
 * (What it does, How it works, Why local, My role).
 */
const ACTIVE_BY_BLOCK = [[0, 2, 4], [0, 1, 2, 3, 4], [1], [0, 1, 2, 3, 4]];

/** 05 · Supernova — case study: receipt/invoice extraction with a local vision model. */
export function CaseStudy() {
  const t = useTranslations("caseStudy");
  const blocks = t.raw("blocks") as Block[];
  const nodes = t.raw("nodes") as Node[];
  const badges = t.raw("badges") as string[];
  const [activeBlock, setActiveBlock] = useState(0);

  const meta = [
    [t("meta.roleLabel"), t("meta.role")],
    [t("meta.teamLabel"), t("meta.team")],
    [t("meta.modelLabel"), t("meta.model")],
    [t("meta.stackLabel"), t("meta.stack")],
  ];

  return (
    <Section id="case-study" className="overflow-clip">
      <BackgroundBeams className="opacity-60" />
      <div className="relative">
        <div className="mb-6 flex flex-wrap gap-2">
          {badges.map((b) => (
            <Tag key={b} accent="cyan">{b}</Tag>
          ))}
        </div>
        <SectionHeader id="case-study" orbit={t("orbit")} title={t("title")} intro={t("lede")} />

        <motion.dl variants={revealUp} initial="hidden" whileInView="visible" viewport={viewportOnce} className="glass mb-16 grid grid-cols-2 gap-6 rounded-2xl p-6 md:grid-cols-4">
          {meta.map(([k, v]) => (
            <div key={k}>
              <dt className="label-mono text-ink-muted">{k}</dt>
              <dd className="mt-1 text-ink">{v}</dd>
            </div>
          ))}
        </motion.dl>

        <div className="grid gap-12 lg:grid-cols-12">
          {/* Diagram: first on mobile, sticky on the right on desktop */}
          <figure className="lg:order-2 lg:col-span-7">
            <div className="lg:sticky lg:top-28">
              <figcaption className="label-mono mb-4 text-ink-muted">{t("pipelineTitle")}</figcaption>
              <Pipeline nodes={nodes} active={ACTIVE_BY_BLOCK[activeBlock] ?? []} runtime={t("runtime")} />
            </div>
          </figure>

          <div className="relative lg:order-1 lg:col-span-5">
            <div aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-[linear-gradient(to_bottom,transparent,#22d3ee55,transparent)]" />
            {blocks.map((b, i) => (
              <NarrativeBlock key={b.title} block={b} index={i} active={activeBlock === i} onActive={setActiveBlock} />
            ))}
            <p className="mt-6 pl-6 text-sm text-ink-muted">{t("note")}</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function NarrativeBlock({ block, index, active, onActive }: { block: Block; index: number; active: boolean; onActive: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  return (
    <div ref={ref} className="relative pb-12 pl-6 lg:min-h-[38vh]">
      <span aria-hidden className={cn("absolute -left-[3px] top-2 size-[7px] rounded-full transition-colors", active ? "bg-cyan shadow-[0_0_10px_2px_rgb(34_211_238/0.6)]" : "bg-ink-muted")} />
      <h3 className={cn("font-display text-xl font-bold transition-colors", active ? "text-ink" : "text-ink-soft")}>{block.title}</h3>
      <p className="mt-3 leading-relaxed text-ink-soft">{block.body}</p>
    </div>
  );
}

function Pipeline({ nodes, active, runtime }: { nodes: Node[]; active: number[]; runtime: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-cyan/30 p-4 md:p-6">
      {/* Accessible text alternative */}
      <ol className="sr-only">
        {nodes.map((n) => (
          <li key={n.title}>{n.title}: {n.detail}</li>
        ))}
      </ol>
      <div aria-hidden className="flex flex-col gap-3 sm:flex-row sm:flex-wrap md:flex-nowrap md:items-stretch">
        {nodes.map((n, i) => {
          const Icon = ICONS[i];
          const on = active.includes(i);
          return (
            <div key={n.title} className="flex flex-1 flex-col items-stretch sm:flex-row md:min-w-0">
              <div
                className={cn(
                  "glass flex flex-1 flex-col gap-2 rounded-xl p-3 transition-all duration-500 md:min-w-0",
                  on ? "border-cyan/50 glow-cyan" : "opacity-60",
                )}
              >
                <Icon className={cn("size-5", on ? "text-cyan" : "text-ink-muted")} />
                <p className="text-sm font-semibold leading-tight">{n.title}</p>
                <p className="text-xs leading-snug text-ink-muted">{n.detail}</p>
              </div>
              {i < nodes.length - 1 && <Connector on={on && active.includes(i + 1)} />}
            </div>
          );
        })}
      </div>
      <p className="label-mono mt-5 text-center text-cyan/80">{runtime}</p>
    </div>
  );
}

/** Animated beam between nodes (vertical on mobile, horizontal from md). */
function Connector({ on }: { on: boolean }) {
  return (
    <div className="relative flex h-6 items-center justify-center self-center md:h-auto md:w-4">
      <div className="h-full w-px bg-line md:h-px md:w-full" />
      {on && (
        <span className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 animate-[beam-y_1.6s_linear_infinite] bg-cyan md:left-0 md:top-1/2 md:h-px md:w-2 md:-translate-y-1/2 md:translate-x-0 md:animate-[beam-x_1.6s_linear_infinite]" />
      )}
    </div>
  );
}
