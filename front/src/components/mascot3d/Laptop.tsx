"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo, type Ref } from "react";
import { Color, MeshPhysicalMaterial, MeshStandardMaterial, type Object3D } from "three";

type Props = {
  /** Root of the laptop (scaled in/out by `updateLaptop`). */
  rootRef: Ref<Object3D>;
  /** Lid hinged on the far edge, screen facing her. */
  lidRef: Ref<Object3D>;
  position: [number, number, number];
  scale?: number;
};

/** Laptop that sits on the mascot's lap while she works. */
export function Laptop({ rootRef, lidRef, position, scale = 1 }: Props) {
  const mat = useMemo(
    () => ({
      body: new MeshPhysicalMaterial({ color: "#c9ccd8", roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }),
      keyboard: new MeshStandardMaterial({ color: "#171728", roughness: 0.35 }),
      screen: new MeshStandardMaterial({ color: "#0b1830", roughness: 0.2, emissive: new Color("#22d3ee"), emissiveIntensity: 0.6 }),
      logo: new MeshStandardMaterial({ color: "#e040fb", roughness: 0.3, emissive: new Color("#e040fb"), emissiveIntensity: 1.6 }),
    }),
    [],
  );
  return (
    <group position={position} scale={scale}>
      <group ref={rootRef}>
        <RoundedBox args={[0.25, 0.016, 0.17]} radius={0.006} material={mat.body} />
        <mesh material={mat.keyboard} position={[0, 0.0085, -0.005]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.21, 0.11]} />
        </mesh>
        <group ref={lidRef} position={[0, 0.006, 0.083]}>
          <RoundedBox args={[0.25, 0.165, 0.01]} radius={0.005} position={[0, 0.083, 0]} material={mat.body} />
          <mesh material={mat.screen} position={[0, 0.083, -0.0056]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.225, 0.14]} />
          </mesh>
          <mesh material={mat.logo} position={[0, 0.085, 0.0056]}>
            <circleGeometry args={[0.014, 5]} />
          </mesh>
          <pointLight color="#d6f6ff" intensity={0.06} distance={0.45} position={[0, 0.09, -0.08]} />
        </group>
      </group>
    </group>
  );
}

/** Scales the laptop in with the `laptop` spring (0 hidden → 1 open on the lap). */
export function updateLaptop(root: Object3D | undefined, lid: Object3D | undefined, value: number) {
  const lap = Math.max(0, Math.min(1.2, value));
  if (root) {
    root.scale.setScalar(Math.max(0.0001, lap));
    root.visible = lap > 0.02;
  }
  lid?.rotation.set(-0.25 - (1 - Math.min(1, lap)) * 1.2, 0, 0);
}
