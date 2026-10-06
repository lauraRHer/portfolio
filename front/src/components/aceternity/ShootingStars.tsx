"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";

/**
 * Static twinkling starfield + occasional shooting stars on one canvas.
 * Bookends the cosmic journey in the Contact section.
 */
export function ShootingStars({ className, starCount = 140 }: { className?: string; starCount?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { reduced } = useMotionPreference();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    let raf = 0;
    let visible = true;

    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.1 + 0.2,
      tw: Math.random() * Math.PI * 2,
    }));
    let shot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextShot = 1500;

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };

    const draw = (t: number) => {
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const a = reduced ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(t * 0.0008 + s.tw));
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      if (reduced) return;

      if (!shot && t > nextShot) {
        shot = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.4, vx: 9 * dpr, vy: 4 * dpr, life: 1 };
        nextShot = t + 2500 + Math.random() * 3500;
      }
      if (shot) {
        const grad = ctx.createLinearGradient(shot.x, shot.y, shot.x - shot.vx * 10, shot.y - shot.vy * 10);
        grad.addColorStop(0, `rgba(167,139,250,${shot.life})`);
        grad.addColorStop(1, "rgba(34,211,238,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(shot.x, shot.y);
        ctx.lineTo(shot.x - shot.vx * 10, shot.y - shot.vy * 10);
        ctx.stroke();
        shot.x += shot.vx;
        shot.y += shot.vy;
        shot.life -= 0.012;
        if (shot.life <= 0 || shot.x > w || shot.y > h) shot = null;
      }
    };

    const loop = (t: number) => {
      if (visible) draw(t);
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    if (reduced) draw(0);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [reduced, starCount]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
