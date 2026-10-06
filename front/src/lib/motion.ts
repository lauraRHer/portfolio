import type { Transition, Variants } from "motion/react";

/** Shared motion presets. */
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeInOutCine = [0.65, 0, 0.35, 1] as const;

export const durations = { fast: 0.15, base: 0.3, slow: 0.6, epic: 1.4 } as const;

export const spring: Transition = { type: "spring", stiffness: 260, damping: 30 };

/** Reveal-once-on-scroll: fade + 24px rise. */
export const revealUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: durations.slow, ease: easeOutExpo } },
};

/** Container that staggers its children (max ~8 items look good). */
export const stagger = (delay = 0.07): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
});

/** Standard viewport options so content animates only once. */
export const viewportOnce = { once: true, amount: 0.3 } as const;
