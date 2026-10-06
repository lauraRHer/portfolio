"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { PerspectiveCamera, Vector3, type Object3D } from "three";
import { GALAXY } from "./config";
import type { GalaxyInteraction } from "./interaction";

type Props = {
  target: React.RefObject<Object3D | null>;
  interaction: React.RefObject<GalaxyInteraction>;
  getDive: () => number;
};

const base = new Vector3(...GALAXY.camera.position);
const origin = new Vector3(0, 0, 0);
const starWorld = new Vector3();
const desired = new Vector3();
const approach = new Vector3();
const look = new Vector3();
const parallax = new Vector3();

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Drives the camera:
 *  - idle: subtle parallax following the pointer
 *  - dive (scroll): travels along the line base → target star and ends
 *    almost inside it, widening the FOV for a "warp" feeling.
 */
export function CameraRig({ target, interaction: interactionRef, getDive }: Props) {
  const smoothLook = useRef(new Vector3());

  useFrame((state, delta) => {
    const { camera } = state;
    const interaction = interactionRef.current;
    const dive = easeInOutCubic(getDive());
    const star = target.current;
    if (!star) return;
    star.getWorldPosition(starWorld);

    // Stop just in front of the star, on the side facing the start position.
    approach.copy(base).sub(starWorld).normalize().multiplyScalar(0.18).add(starWorld);
    desired.copy(base).lerp(approach, dive);

    // Pointer parallax fades out during the dive.
    parallax.set(interaction.pointer.x * 0.35, interaction.pointer.y * 0.2, 0).multiplyScalar(1 - dive);
    desired.add(parallax);

    camera.position.lerp(desired, Math.min(1, delta * 6));

    look.copy(origin).lerp(starWorld, Math.min(1, dive * 2.2));
    smoothLook.current.lerp(look, Math.min(1, delta * 6));
    camera.lookAt(smoothLook.current);

    if (camera instanceof PerspectiveCamera) {
      const fov = GALAXY.camera.fov + dive * dive * 22;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
