"use client";

import { MotionConfig } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

/**
 * Global motion preference.
 * `reduced` is true when the OS asks for reduced motion OR the visitor
 * toggled "Reduce motion" in the footer (persisted in localStorage).
 * Every animated component should read this instead of the media query.
 */
type MotionPreference = {
  reduced: boolean;
  userOverride: boolean;
  toggle: () => void;
};

const STORAGE_KEY = "lrh:reduce-motion";
const MotionPreferenceContext = createContext<MotionPreference | null>(null);

export function MotionPreferenceProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore-based: returns the server value (false) during hydration,
  // then updates. (motion's useReducedMotion reads matchMedia on the first client
  // render, which caused a hydration mismatch in the hero.)
  const systemReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [userOverride, setUserOverride] = useState(false);

  useEffect(() => {
    try {
      // Sync from localStorage once on mount (not available during SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserOverride(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* storage unavailable: keep default */
    }
  }, []);

  const reduced = systemReduced || userOverride;

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduce" : "full";
  }, [reduced]);

  const toggle = useCallback(() => {
    setUserOverride((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ reduced, userOverride, toggle }), [reduced, userOverride, toggle]);

  return (
    <MotionPreferenceContext.Provider value={value}>
      <MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig>
    </MotionPreferenceContext.Provider>
  );
}

export function useMotionPreference() {
  const ctx = useContext(MotionPreferenceContext);
  if (!ctx) throw new Error("useMotionPreference must be used inside MotionPreferenceProvider");
  return ctx;
}
