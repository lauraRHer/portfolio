"use client";

import { useCallback, useRef, type RefObject } from "react";
import type { GalaxyInteraction } from "./interaction";

const CLICK_MAX_MOVE = 6; // px
const AXIS_LOCK = 8; // px before deciding drag direction on touch
const TILT_LIMIT = 0.55; // rad

/**
 * DOM pointer handlers for the galaxy wrapper.
 *
 * - Mouse: hover always; press + move = rotate (horizontal → spin, vertical → tilt).
 * - Touch: only horizontal-dominant drags rotate; vertical swipes keep
 *   scrolling the page (the wrapper uses `touch-action: pan-y`).
 * - A press without movement = click → shockwave.
 */
export function useGalaxyPointer(interactionRef: RefObject<GalaxyInteraction>) {
  const start = useRef<{ x: number; y: number; lastX: number; lastY: number; locked: "x" | "y" | null } | null>(null);

  const updatePointer = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const interaction = interactionRef.current;
      const rect = e.currentTarget.getBoundingClientRect();
      interaction.pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
    },
    [interactionRef],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const interaction = interactionRef.current;
      if (e.button !== 0) return;
      updatePointer(e);
      start.current = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, locked: null };
      if (e.pointerType === "mouse") {
        interaction.dragging = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [interactionRef, updatePointer],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const interaction = interactionRef.current;
      updatePointer(e);
      if (e.pointerType === "mouse") interaction.hovering = true;

      const s = start.current;
      if (!s) return;

      const totalX = e.clientX - s.x;
      const totalY = e.clientY - s.y;

      // Touch: decide once whether this gesture rotates or scrolls.
      if (e.pointerType !== "mouse" && !s.locked) {
        if (Math.hypot(totalX, totalY) < AXIS_LOCK) return;
        s.locked = Math.abs(totalX) > Math.abs(totalY) ? "x" : "y";
        if (s.locked === "y") {
          start.current = null; // let the browser scroll
          return;
        }
        interaction.dragging = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }

      if (!interaction.dragging) return;

      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;

      interaction.spinVelocity += dx * 0.0009;
      if (e.pointerType === "mouse") {
        interaction.tilt = Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, interaction.tilt + dy * 0.004));
      }
    },
    [interactionRef, updatePointer],
  );

  const endPress = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const interaction = interactionRef.current;
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) < CLICK_MAX_MOVE) {
        interaction.clickRequested = true;
      }
      start.current = null;
      interaction.dragging = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (e.pointerType !== "mouse") interaction.hovering = false;
    },
    [interactionRef],
  );

  const onPointerLeave = useCallback(() => {
    interactionRef.current.hovering = false;
  }, [interactionRef]);

  const onPointerCancel = useCallback(() => {
    start.current = null;
    interactionRef.current.dragging = false;
    interactionRef.current.hovering = false;
  }, [interactionRef]);

  return { onPointerDown, onPointerMove, onPointerUp: endPress, onPointerLeave, onPointerCancel };
}
