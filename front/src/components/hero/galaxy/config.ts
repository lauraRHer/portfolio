import type { DeviceTier } from "@/lib/hooks/useDeviceTier";

/**
 * Tunable parameters of the galaxy. Tweak here, not inside components.
 * Units are three.js world units (camera starts ~8 units away).
 */
export const GALAXY = {
  radius: 5.2,
  branches: 3,
  /** How much the arms curl. */
  spin: 1.15,
  /** Scatter of particles around the arm center line. */
  randomness: 0.75,
  /** >1 concentrates particles near the arm center line. */
  randomnessPower: 2.2,
  /** Vertical thickness of the disc. */
  thickness: 0.32,
  /** Fraction of particles spread as a diffuse halo. */
  haloRatio: 0.1,
  colors: {
    core: "#fff1fb",
    inner: "#e040fb",
    mid: "#8b5cf6",
    outer: "#22d3ee",
  },
  /** Base point size in pixels at distance 1 (before attenuation). */
  pointSize: 44,
  /** Idle rotation speed (rad/s). */
  idleSpeed: 0.045,
  /** Radius (world units) of the hover repulsion field. */
  hoverRadius: 0.8,
  /** Where the star we dive into lives (galaxy local space). */
  targetStar: [2.15, 0.06, 1.25] as const,
  camera: {
    position: [0, 3.4, 7.6] as const,
    fov: 58,
  },
} as const;

/** Particle budget per device tier. */
export const PARTICLES_BY_TIER: Record<DeviceTier, number> = {
  desktop: 70_000,
  tablet: 32_000,
  mobile: 14_000,
  low: 9_000,
};

export const MAX_DPR_BY_TIER: Record<DeviceTier, number> = {
  desktop: 1.5,
  tablet: 1.5,
  mobile: 1.25,
  low: 1,
};

/**
 * Scroll choreography of the hero (progress 0 → 1 over the pinned hero).
 * See docs/ARCHITECTURE.md → "Hero: la galaxia".
 */
export const SCROLL = {
  titleFadeEnd: 0.22,
  diveStart: 0.08,
  diveEnd: 0.94,
  flashStart: 0.82,
  flashPeak: 0.9,
  coreTintStart: 0.88,
} as const;
