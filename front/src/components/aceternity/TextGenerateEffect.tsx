"use client";

import { motion, stagger, useAnimate, useInView } from "motion/react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/** Words fade in from blur, one after another (~1s total). Use for one short line only. */
export function TextGenerateEffect({ words, className }: { words: string; className?: string }) {
  const [scope, animate] = useAnimate();
  const inView = useInView(scope, { once: true });

  useEffect(() => {
    if (!inView) return;
    animate("span", { opacity: 1, filter: "blur(0px)" }, { duration: 0.5, delay: stagger(0.08) });
  }, [inView, animate]);

  return (
    <span ref={scope} className={cn("inline", className)}>
      {words.split(" ").map((word, i) => (
        <motion.span key={`${word}-${i}`} className="opacity-0" style={{ filter: "blur(8px)" }}>
          {word}{" "}
        </motion.span>
      ))}
    </span>
  );
}
