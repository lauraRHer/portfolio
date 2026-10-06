"use client";

import { useSyncExternalStore } from "react";

let cached: boolean | null = null;

/** Tries to create a WebGL context once (cached). */
function detect(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    cached = !!gl;
    // Free the probe context immediately.
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

/**
 * `null` on the server / during hydration, then `true | false`.
 * Browsers with hardware acceleration disabled or a blocklisted GPU
 * report no WebGL: the hero falls back to the static galaxy.
 */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(
    () => () => {},
    detect,
    () => null,
  );
}
