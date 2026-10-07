"use client";

import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { AstronautGLB } from "./AstronautGLB";
import { WAVE_ARM, createLayers, createRig } from "./rigState";

const POSES = {
  stand: { rootX: 0, rootY: 0, rootRy: 0, hipLx: 0, hipRx: 0, kneeLx: 0, kneeRx: 0, shLx: 0, shRx: 0, shLz: -0.15, shRz: 0.15, elLx: 0, elRx: 0, elLz: 0.12, elRz: -0.12, laptop: 0, headRx: 0, headRy: 0 },
  wave: WAVE_ARM,
  seated: { rootX: 0, rootY: -0.28, rootRy: -0.62, hipLx: -1.5, hipRx: -1.5, kneeLx: 1.45, kneeRx: 1.4, shLx: -1.05, shRx: -1.05, shLz: -0.08, shRz: 0.08, elLx: -0.35, elRx: -0.35, elLz: 0.1, elRz: -0.1, laptop: 1, headRx: 0.3, headRy: 0.05 },
} as const;

/** Big, orbitable view of the mascot with pose and layer switches. Dev only. */
export function MascotPreview() {
  const [rig] = useState(() => {
    const r = createRig();
    r.snap({ rootX: 0, rootY: 0 });
    return r;
  });
  const [layers] = useState(createLayers);
  const [, force] = useState(0);

  return (
    <div className="flex h-svh flex-col bg-space-900 text-ink">
      <div className="flex flex-wrap gap-2 p-4 text-sm">
        {(Object.keys(POSES) as (keyof typeof POSES)[]).map((p) => (
          <button key={p} className="rounded border border-line px-3 py-1 hover:border-cyan" onClick={() => rig.set(POSES[p])}>
            {p}
          </button>
        ))}
        <span className="mx-2 opacity-40">|</span>
        {(["wave", "typing", "talk", "kick"] as const).map((l) => (
          <button
            key={l}
            className="rounded border border-line px-3 py-1 hover:border-magenta"
            onClick={() => {
              layers[l] = !layers[l];
              force((n) => n + 1);
            }}
          >
            {l}: {layers[l] ? "on" : "off"}
          </button>
        ))}
      </div>
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0.75, 2.2], fov: 30 }} dpr={[1, 2]}>
          <color attach="background" args={["#0a0a14"]} />
          <hemisphereLight args={["#dfe4ff", "#3b2a55", 0.75]} />
          <directionalLight color="#fff1e2" intensity={2.1} position={[-1.4, 2.4, 3]} />
          <directionalLight color="#9cc4ff" intensity={0.6} position={[2, 0.6, 2]} />
          <directionalLight color="#b48cff" intensity={2.2} position={[1.6, 1.8, -2.5]} />
          <Environment resolution={64}>
            <Lightformer intensity={2.4} position={[0, 2.5, 3]} scale={[4, 1.2, 1]} />
            <Lightformer intensity={1.2} color="#a78bfa" position={[3, 1, -1]} scale={[2, 2, 1]} />
            <Lightformer intensity={0.8} color="#22d3ee" position={[-3, 0.5, 1]} scale={[2, 2, 1]} />
          </Environment>
          <Suspense fallback={null}>
            <AstronautGLB rig={rig} layers={layers} />
          </Suspense>
          <OrbitControls target={[0, 0.75, 0]} />
        </Canvas>
      </div>
    </div>
  );
}
