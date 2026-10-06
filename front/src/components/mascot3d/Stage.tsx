"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { AstronautGLB } from "./AstronautGLB";
import type { Layers, Rig } from "./rigState";

type Props = { rig: Rig; layers: Layers; widthPx: number; heightPx: number; zoom: number; running: boolean };

/**
 * Transparent canvas pinned to the bottom-right corner. Orthographic camera
 * aligned with the screen: world y = 0 is the bottom edge of the viewport
 * (the "ledge" she climbs), 1 unit = `zoom` px.
 */
export default function Stage({ rig, layers, widthPx, heightPx, zoom, running }: Props) {
  const viewH = heightPx / zoom;
  return (
    <Canvas
      orthographic
      frameloop={running ? "always" : "never"}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      // rotation given explicitly so R3F does not lookAt(0,0,0) (that would tilt the view)
      camera={{ zoom, position: [0, viewH / 2, 10], rotation: [0, 0, 0], near: 0.1, far: 50 }}
      style={{ width: widthPx, height: heightPx, pointerEvents: "none" }}
    >
      {/* studio lighting: warm key, cool fill, violet rim → soft "animated film" look */}
      <hemisphereLight args={["#dfe4ff", "#3b2a55", 0.75]} />
      <directionalLight color="#fff1e2" intensity={2.1} position={[-1.4, 2.4, 3]} />
      <directionalLight color="#9cc4ff" intensity={0.6} position={[2, 0.6, 2]} />
      <directionalLight color="#b48cff" intensity={2.2} position={[1.6, 1.8, -2.5]} />
      {/* local environment (no network) for soft reflections on suit and gloves */}
      <Environment resolution={64}>
        <Lightformer intensity={2.4} position={[0, 2.5, 3]} scale={[4, 1.2, 1]} />
        <Lightformer intensity={1.2} color="#a78bfa" position={[3, 1, -1]} scale={[2, 2, 1]} />
        <Lightformer intensity={0.8} color="#22d3ee" position={[-3, 0.5, 1]} scale={[2, 2, 1]} />
      </Environment>
      {/* the model streams in while she is still below the edge */}
      <Suspense fallback={null}>
        <AstronautGLB rig={rig} layers={layers} />
      </Suspense>
    </Canvas>
  );
}
