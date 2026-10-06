"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Matrix4, Plane, Ray, Raycaster, Vector3, type Group, type ShaderMaterial } from "three";
import { GALAXY } from "./config";
import { generateGalaxy } from "./generateGalaxy";
import type { GalaxyInteraction } from "./interaction";
import { galaxyFragmentShader, galaxyVertexShader } from "./shaders";

type Props = {
  count: number;
  interaction: React.RefObject<GalaxyInteraction>;
  /** Smoothed 0..1 dive progress (read every frame). */
  getDive: () => number;
  children?: React.ReactNode;
};

const galaxyPlane = new Plane(new Vector3(0, 1, 0), 0);
const raycaster = new Raycaster();
const hit = new Vector3();
const inverseWorld = new Matrix4();
const localRay = new Ray();

/**
 * The particle galaxy. Owns the group transform (idle spin + drag spin/tilt),
 * so anything passed as `children` (e.g. the target star) rotates with it.
 */
export function Galaxy({ count, interaction: interactionRef, getDive, children }: Props) {
  const group = useRef<Group>(null);
  const material = useRef<ShaderMaterial>(null);
  const spin = useRef(0);
  const clickStart = useRef(-100);
  const { camera, gl } = useThree();

  const buffers = useMemo(() => generateGalaxy(count), [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: GALAXY.pointSize },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      uMouse: { value: new Vector3(999, 0, 999) },
      uHover: { value: 0 },
      uHoverRadius: { value: GALAXY.hoverRadius },
      uClickPos: { value: new Vector3(999, 0, 999) },
      uClickAge: { value: -1 },
      uFade: { value: 1 },
    }),
    [gl],
  );

  useFrame((state, delta) => {
    const interaction = interactionRef.current;
    const g = group.current;
    const m = material.current;
    if (!g || !m) return;
    const dt = Math.min(delta, 0.05); // avoid jumps after tab switches
    const t = state.clock.elapsedTime;
    const dive = getDive();

    // --- Rotation: idle spin slows down while diving; drag adds inertia.
    spin.current += dt * GALAXY.idleSpeed * (1 - dive) + interaction.spinVelocity;
    interaction.spinVelocity *= interaction.dragging ? 0.8 : 0.94;
    if (!interaction.dragging) interaction.tilt *= 1 - dt * 0.35; // ease back
    g.rotation.y = spin.current;
    g.rotation.x = interaction.tilt * (1 - dive);

    // --- Project pointer onto the galaxy plane, in local space.
    raycaster.setFromCamera(interaction.pointer, camera);
    g.updateMatrixWorld();
    localRay.copy(raycaster.ray).applyMatrix4(inverseWorld.copy(g.matrixWorld).invert());
    if (localRay.intersectPlane(galaxyPlane, hit)) interaction.pointerLocal.copy(hit);

    const u = m.uniforms;
    u.uTime.value = t;
    u.uMouse.value.lerp(interaction.pointerLocal, 0.25);
    const hoverTarget = interaction.hovering && dive < 0.05 ? 1 : 0;
    u.uHover.value += (hoverTarget - u.uHover.value) * Math.min(1, dt * 5);

    // --- Click → shockwave from the pointer position.
    if (interaction.clickRequested) {
      interaction.clickRequested = false;
      clickStart.current = t;
      u.uClickPos.value.copy(interaction.pointerLocal);
    }
    u.uClickAge.value = t - clickStart.current < 4 ? t - clickStart.current : -1;

    // --- Fade the galaxy out at the very end of the dive.
    u.uFade.value = 1 - Math.max(0, (dive - 0.8) / 0.2);
  });

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[buffers.colors, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[buffers.scales, 1]} />
          <bufferAttribute attach="attributes-aRandom" args={[buffers.randoms, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={galaxyVertexShader}
          fragmentShader={galaxyFragmentShader}
          vertexColors
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
      {children}
    </group>
  );
}
