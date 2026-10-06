"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";

type Props = { density?: number; className?: string; color?: string };

/**
 * Twinkling particle field on a 2D canvas (lighter than tsparticles).
 * Pauses when off-screen; renders a single static frame with reduced motion.
 */
export function Sparkles({ density = 40, className, color = "255,255,255" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { reduced } = useMotionPreference();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    let visible = true;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const particles = Array.from({ length: density }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.4,
      drift: (Math.random() - 0.5) * 0.00008,
    }));

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y -= p.drift * (reduced ? 0 : 16);
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;
        const alpha = reduced ? 0.6 : 0.25 + 0.75 * Math.abs(Math.sin(t * 0.001 * p.speed + p.phase));
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${alpha})`;
        ctx.fill();
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
  }, [density, reduced, color]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
