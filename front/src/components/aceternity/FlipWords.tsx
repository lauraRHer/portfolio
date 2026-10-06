"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";

/**
 * Cycles through `words`; each new word blurs/slides in.
 * Static first word when motion is reduced.
 * Note: the gradient class goes on an inner span — Chrome drops
 * `background-clip: text` on elements that also have `filter`.
 */
export function FlipWords({ words, interval = 2600, className }: { words: string[]; interval?: number; className?: string }) {
  const [index, setIndex] = useState(0);
  const { reduced } = useMotionPreference();

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval, reduced]);

  return (
    <motion.span
      key={words[index]}
      initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.4 }}
      className="inline-block"
    >
      <span className={className}>{words[index]}</span>
    </motion.span>
  );
}
