"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/** Comic bubble that types its text out, character by character. */
export function SpeechBubble({ text, style }: { text: string | null; style: React.CSSProperties }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0, scale: 0.6, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 6 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          style={{ ...style, transformOrigin: "bottom right" }}
          className="pointer-events-none absolute w-max max-w-[200px] rounded-2xl rounded-br-sm border border-violet/40 bg-space-800/95 px-3.5 py-2 text-sm font-medium leading-snug text-ink shadow-[0_8px_30px_-8px_rgb(139_92_246/0.6)] backdrop-blur md:max-w-[230px]"
          aria-hidden
        >
          <Typewriter text={text} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((i) => (i >= text.length ? i : i + 1)), 32);
    return () => clearInterval(id);
  }, [text]);
  return (
    <span>
      {text.slice(0, n)}
      {/* reserve the final size so the bubble doesn't jump */}
      <span className="invisible">{text.slice(n)}</span>
    </span>
  );
}
