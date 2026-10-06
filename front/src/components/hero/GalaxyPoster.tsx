import { cn } from "@/lib/utils";

/**
 * Static, CSS-only galaxy. Used as:
 *  - the LCP poster while the 3D chunk loads
 *  - the full replacement when motion is reduced
 */
export function GalaxyPoster({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* starfield */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 72% 12%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 33% 77%, #c4b5fd 50%, transparent 51%), radial-gradient(1px 1px at 86% 64%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 52% 32%, #a5f3fc 50%, transparent 51%), radial-gradient(1.5px 1.5px at 8% 88%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 92% 90%, #f0abfc 50%, transparent 51%)",
          backgroundSize: "340px 340px",
        }}
      />
      {/* galactic disc: flattened ellipse (seen at an angle) with a conic swirl */}
      <div className="absolute left-1/2 top-1/2 h-[42vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2">
        <div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background:
              "conic-gradient(from 20deg, transparent 0deg, rgb(139 92 246 / .55) 40deg, transparent 110deg, rgb(34 211 238 / .35) 160deg, transparent 230deg, rgb(224 64 251 / .45) 290deg, transparent 360deg)",
            maskImage: "radial-gradient(closest-side, black 30%, transparent 100%)",
          }}
        />
      </div>
      <div
        className="absolute left-1/2 top-1/2 h-[36vmin] w-[36vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, #fff1fb 0%, rgb(224 64 251 / .6) 25%, rgb(139 92 246 / .25) 55%, transparent 70%)" }}
      />
    </div>
  );
}
