import { Vector2, Vector3 } from "three";

/**
 * Mutable interaction state shared between DOM pointer handlers
 * (useGalaxyPointer) and the render loop (useFrame).
 *
 * It is intentionally NOT React state: it changes every frame and must
 * never trigger re-renders.
 */
export type GalaxyInteraction = {
  /** Pointer in normalized device coords (-1..1). */
  pointer: Vector2;
  /** Pointer projected onto the galaxy plane, in galaxy local space. */
  pointerLocal: Vector3;
  hovering: boolean;
  dragging: boolean;
  /** Angular velocity added by dragging (rad/frame), decays with inertia. */
  spinVelocity: number;
  /** Accumulated tilt from vertical drag (rad). */
  tilt: number;
  /** Pending click flag; consumed by the render loop. */
  clickRequested: boolean;
};

export const createInteraction = (): GalaxyInteraction => ({
  pointer: new Vector2(0, 0),
  pointerLocal: new Vector3(999, 0, 999),
  hovering: false,
  dragging: false,
  spinVelocity: 0,
  tilt: 0,
  clickRequested: false,
});
