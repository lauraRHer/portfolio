"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useMemo, useRef } from "react";
import { AdditiveBlending, type Mesh, type Object3D, type ShaderMaterial } from "three";
import { GALAXY } from "./config";
import { starGlowFragmentShader, starGlowVertexShader } from "./shaders";

type Props = { getDive: () => number };

/**
 * The star the camera dives into. Lives inside the Galaxy group so it
 * rotates with it; the CameraRig reads its world position via the ref.
 */
export const TargetStar = forwardRef<Object3D, Props>(function TargetStar({ getDive }, ref) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uIntensity: { value: 1 } }), []);

  useFrame((state) => {
    const dive = getDive();
    if (material.current) material.current.uniforms.uTime.value = state.clock.elapsedTime;
    // Grows slightly while approaching so it reads as "the destination".
    if (mesh.current) mesh.current.scale.setScalar(0.85 + Math.pow(dive, 3) * 1.6);
  });

  return (
    <group ref={ref} position={GALAXY.targetStar}>
      <Billboard>
        <mesh ref={mesh}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            ref={material}
            uniforms={uniforms}
            vertexShader={starGlowVertexShader}
            fragmentShader={starGlowFragmentShader}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      </Billboard>
    </group>
  );
});
