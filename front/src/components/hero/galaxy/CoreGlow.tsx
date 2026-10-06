"use client";

import { Billboard } from "@react-three/drei";
import { useMemo } from "react";
import { AdditiveBlending } from "three";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fragment = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5);
    float g = pow(smoothstep(0.5, 0.0, d), 2.6);
    vec3 col = mix(vec3(0.55, 0.36, 0.96), vec3(1.0, 0.9, 0.98), smoothstep(0.25, 0.0, d));
    gl_FragColor = vec4(col * g * 0.55, g * 0.55);
  }
`;

/** Soft luminous halo at the galactic center (cheap: one quad). */
export function CoreGlow() {
  const uniforms = useMemo(() => ({}), []);
  return (
    <Billboard>
      <mesh>
        <planeGeometry args={[3.2, 3.2]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </Billboard>
  );
}
