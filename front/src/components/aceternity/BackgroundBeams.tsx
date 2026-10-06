import { cn } from "@/lib/utils";

/** Soft curved light beams (SVG). Animated via CSS dash offset; static under reduced motion. */
export function BackgroundBeams({ className }: { className?: string }) {
  const paths = Array.from({ length: 12 }, (_, i) => {
    const o = i * 28;
    return `M${-380 + o} ${-189 - i * 6}C${-380 + o} ${-189 - i * 6} ${-312 + o} ${216 - i * 6} ${152 + o} ${343 - i * 6}C${616 + o} ${470 - i * 6} ${684 + o} ${875 - i * 6} ${684 + o} ${875 - i * 6}`;
  });
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]", className)}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="beam-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {paths.map((d, i) => (
          <path key={`base-${i}`} d={d} stroke="rgb(255 255 255 / 0.04)" strokeWidth="0.5" />
        ))}
        {paths.map((d, i) => (
          <path
            key={`beam-${i}`}
            d={d}
            stroke="url(#beam-grad)"
            strokeWidth="0.8"
            strokeDasharray="60 1400"
            className="beam-path"
            style={{ animationDelay: `${i * 0.9}s`, animationDuration: `${9 + (i % 4) * 2}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
