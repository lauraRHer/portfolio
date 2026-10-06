import { cn } from "@/lib/utils";
import type { Accent } from "@/content/types";

const accents: Record<Accent | "neutral", string> = {
  neutral: "border-line text-ink-soft",
  violet: "border-violet/30 text-violet-soft bg-violet/5",
  cyan: "border-cyan/30 text-cyan bg-cyan/5",
  magenta: "border-magenta/30 text-magenta bg-magenta/5",
};

/** Small mono pill for technologies, categories and badges. */
export function Tag({ children, accent = "neutral", className }: { children: React.ReactNode; accent?: Accent | "neutral"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 font-mono text-[0.72rem] leading-none tracking-wide", accents[accent], className)}>
      {children}
    </span>
  );
}
