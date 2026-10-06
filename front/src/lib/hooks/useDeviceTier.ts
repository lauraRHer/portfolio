"use client";

import { useMemo } from "react";
import { useMediaQuery } from "./useMediaQuery";

export type DeviceTier = "low" | "mobile" | "tablet" | "desktop";

/**
 * Rough device capability bucket used to size the 3D scene
 * (particle budget, DPR).
 */
export function useDeviceTier(): DeviceTier {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1199px)");

  return useMemo(() => {
    if (typeof navigator !== "undefined") {
      const cores = navigator.hardwareConcurrency ?? 8;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
      if (cores <= 4 || memory <= 4) return "low";
    }
    if (isMobile) return "mobile";
    if (isTablet) return "tablet";
    return "desktop";
  }, [isMobile, isTablet]);
}
