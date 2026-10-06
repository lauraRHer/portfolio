import { cn } from "@/lib/utils";

/** Diagonal shooting meteors (CSS). Hidden under reduced motion. */
export function Meteors({ count = 14, className }: { count?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("motion-safe-only pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 h-0.5 w-0.5 animate-meteor rounded-full bg-white shadow-[0_0_0_1px_#ffffff10] before:absolute before:top-1/2 before:h-px before:w-[60px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-violet-soft before:to-transparent"
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i * 0.73) % 5}s`,
            animationDuration: `${3 + (i % 5)}s`,
          }}
        />
      ))}
    </div>
  );
}
