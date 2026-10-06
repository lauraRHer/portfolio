import { Color } from "three";
import { GALAXY } from "./config";

export type GalaxyBuffers = {
  positions: Float32Array;
  colors: Float32Array;
  scales: Float32Array;
  randoms: Float32Array;
};

/** Deterministic PRNG so the galaxy looks the same on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a spiral galaxy as typed arrays ready for a BufferGeometry.
 * Arms: particles are placed along `branches` logarithmic-ish arms whose
 * angle grows with the radius (`spin`), then scattered with a power curve
 * so they concentrate on the arm center line.
 */
export function generateGalaxy(count: number, seed = 7): GalaxyBuffers {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const randoms = new Float32Array(count * 3);

  const core = new Color(GALAXY.colors.core);
  const inner = new Color(GALAXY.colors.inner);
  const mid = new Color(GALAXY.colors.mid);
  const outer = new Color(GALAXY.colors.outer);
  const tmp = new Color();

  const scatter = (r: number) =>
    Math.pow(rand(), GALAXY.randomnessPower) * (rand() < 0.5 ? 1 : -1) * GALAXY.randomness * (0.35 + r * 0.6);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const isHalo = rand() < GALAXY.haloRatio;

    let x: number, y: number, z: number, radius: number;

    if (isHalo) {
      // Diffuse spherical-ish halo for depth.
      radius = Math.pow(rand(), 0.6) * GALAXY.radius * 1.15;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      x = radius * Math.sin(phi) * Math.cos(theta);
      z = radius * Math.sin(phi) * Math.sin(theta);
      y = radius * Math.cos(phi) * 0.18;
    } else if (rand() < 0.14) {
      // Central bulge: a flattened sphere, denser towards the middle.
      radius = Math.pow(rand(), 2.2) * GALAXY.radius * 0.28;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      x = radius * Math.sin(phi) * Math.cos(theta);
      z = radius * Math.sin(phi) * Math.sin(theta);
      y = radius * Math.cos(phi) * 0.45;
    } else {
      // Arms. Bias towards the center: more particles near the bulge.
      radius = 0.25 + Math.pow(rand(), 1.4) * (GALAXY.radius - 0.25);
      const branchAngle = ((i % GALAXY.branches) / GALAXY.branches) * Math.PI * 2;
      const spinAngle = radius * GALAXY.spin;
      const r01 = radius / GALAXY.radius;
      x = Math.cos(branchAngle + spinAngle) * radius + scatter(r01);
      z = Math.sin(branchAngle + spinAngle) * radius + scatter(r01);
      y = scatter(0.4) * GALAXY.thickness * (1.4 - r01);
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    // Color by normalized radius: core → inner → mid → outer.
    const t = Math.min(radius / GALAXY.radius, 1);
    if (t < 0.12) tmp.copy(core).lerp(inner, t / 0.12);
    else if (t < 0.5) tmp.copy(inner).lerp(mid, (t - 0.12) / 0.38);
    else tmp.copy(mid).lerp(outer, (t - 0.5) / 0.5);
    if (isHalo) tmp.lerp(mid, 0.5).multiplyScalar(0.55);

    colors[i3] = tmp.r;
    colors[i3 + 1] = tmp.g;
    colors[i3 + 2] = tmp.b;

    // A few bright "stars" among the dust.
    scales[i] = rand() < 0.015 ? 2.2 + rand() * 1.5 : 0.35 + rand() * 0.85;

    randoms[i3] = rand();
    randoms[i3 + 1] = rand() * 2 - 1;
    randoms[i3 + 2] = rand();
  }

  return { positions, colors, scales, randoms };
}
