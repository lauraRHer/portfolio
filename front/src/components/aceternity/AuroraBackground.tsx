import { cn } from "@/lib/utils";

/** Slow-drifting plasma, recoloured violet/magenta ("inside the star"). Pure CSS. */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute -inset-[10px] animate-aurora opacity-40 blur-[60px] will-change-transform [mask-image:radial-gradient(ellipse_at_60%_20%,black_10%,transparent_70%)] motion-reduce:animate-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(100deg, #05050a 0%, #05050a 7%, transparent 10%, transparent 12%, #05050a 16%), repeating-linear-gradient(100deg, #8b5cf6 10%, #e040fb 15%, #a78bfa 20%, #c026d3 25%, #8b5cf6 30%)",
          backgroundSize: "300%, 200%",
        }}
      />
    </div>
  );
}
