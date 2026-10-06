import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number into [min, max]. */
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Map v from [inMin, inMax] to [0, 1], clamped. */
export const progressBetween = (v: number, inMin: number, inMax: number) =>
  clamp((v - inMin) / (inMax - inMin), 0, 1);
