"use client";

import { PerformanceMonitor, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useCallback, useRef, useState } from "react";
import type { Object3D } from "three";
import type { DeviceTier } from "@/lib/hooks/useDeviceTier";
import { progressBetween } from "@/lib/utils";
import { CameraRig } from "./CameraRig";
import { CoreGlow } from "./CoreGlow";
import { GALAXY, MAX_DPR_BY_TIER, PARTICLES_BY_TIER, SCROLL } from "./config";
import { Galaxy } from "./Galaxy";
import { createInteraction } from "./interaction";
import { TargetStar } from "./TargetStar";
import { useGalaxyPointer } from "./useGalaxyPointer";

type Props = {
  /** Hero scroll progress (0..1), provided by <Hero/>. */
  progress: MotionValue<number>;
  tier: DeviceTier;
  /** Pause rendering when the hero is off-screen. */
  active: boolean;
  onReady?: () => void;
  label: string;
};

/**
 * Root of the 3D hero. Loaded with next/dynamic (ssr: false) so three.js
 * never ends up in the initial JS bundle.
 */
export default function GalaxyScene({ progress, tier, active, onReady, label }: Props) {
  const interaction = useRef(createInteraction());
  const handlers = useGalaxyPointer(interaction);
  const starRef = useRef<Object3D>(null);
  const [dpr, setDpr] = useState(MAX_DPR_BY_TIER[tier]);

  // Read the scroll MotionValue inside the render loop without re-rendering React.
  const getDive = useCallback(
    () => progressBetween(progress.get(), SCROLL.diveStart, SCROLL.diveEnd),
    [progress],
  );

  return (
    <div
      role="img"
      aria-label={label}
      className="absolute inset-0 cursor-grab touch-pan-y select-none active:cursor-grabbing"
      {...handlers}
    >
      <Canvas
        dpr={[1, dpr]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [...GALAXY.camera.position], fov: GALAXY.camera.fov, near: 0.01, far: 200 }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        onCreated={() => onReady?.()}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        <Stars radius={60} depth={40} count={tier === "desktop" ? 3000 : 1200} factor={3} saturation={0.4} fade speed={0.4} />
        <Galaxy count={PARTICLES_BY_TIER[tier]} interaction={interaction} getDive={getDive}>
          <CoreGlow />
          <TargetStar ref={starRef} getDive={getDive} />
        </Galaxy>
        <CameraRig target={starRef} interaction={interaction} getDive={getDive} />
      </Canvas>
    </div>
  );
}
