"use client";

import { useGLTF } from "@react-three/drei";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { MeshLambertMaterial, type MeshStandardMaterial, type Object3D, type SkinnedMesh } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { twoBoneIK } from "./ik";
import { Laptop, updateLaptop } from "./Laptop";
import { CharacterRuntime } from "./runtime";
import { SpringSet } from "./springs";
import type { Layers, Rig } from "./rigState";

/**
 * Mini-Laura astronaut from the AI-generated model, auto-rigged by
 * `scripts/rig-mascot.mjs` (docs/guides/mascota-3d.md).
 *
 * Feet at the origin, facing +z, driven every frame by the director's springs
 * (`rig`) and procedural `layers`. Limb bones point down their local -y, so the
 * director's angles (rotation about z = swing in the frontal plane) apply to
 * them as they are.
 *
 * The model has no facial blendshapes: talking is suggested with small head
 * nods instead.
 */

export const MASCOT_URL = "/models/mascot.glb";

// ---------------------------------------------------------------- measurements (match the rig script output)
/** Shoulder pivots relative to the root. */
const SHOULDER = { x: 0.099, y: 0.552 };
const UPPER_ARM = 0.122;
/** Elbow → glove centre. */
const FOREARM = 0.112;
/** Where the gloves grip the screen edge while climbing (x offset from the body). */
const GRIP_X = 0.27;
const GRIP_Y = 0.04;
/**
 * Extra outward angle for the arms: without it the director's rest angles
 * would sink the arms into the wide chibi torso.
 */
const ARM_SPLAY = 0.25;

const BONES = ["hips", "spine", "head", "hair", "shL", "elL", "shR", "elR", "hipL", "kneeL", "hipR", "kneeR"] as const;
type BoneName = (typeof BONES)[number];

type Props = { rig: Rig; layers: Layers };

export function AstronautGLB({ rig, layers }: Props) {
  const { scene } = useGLTF(MASCOT_URL);
  // own copy: drei caches the GLTF and a skinned scene can only live in one place
  const model = useMemo(() => {
    const root = clone(scene);
    root.traverse((o) => {
      const mesh = o as SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      // bounds come from the bind pose; raised arms would get culled at the edges
      mesh.frustumCulled = false;
      // The albedo already has the lighting painted in: PBR shading over the many
      // overlapping hair layers looked the same but halved the FPS on integrated GPUs.
      mesh.material = new MeshLambertMaterial({ map: (mesh.material as MeshStandardMaterial).map });
    });
    const bones = Object.fromEntries(BONES.map((n) => [n, root.getObjectByName(n)])) as Record<BoneName, Object3D>;
    return { root, bones };
  }, [scene]);
  const gl = useThree((s) => s.gl);
  const stage = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  // Compile shaders and upload textures while she is still offstage (and the
  // laptop still visible): otherwise the first frames of the climb stall.
  useEffect(() => {
    gl.compile(stage, camera);
    model.root.traverse((o) => {
      const map = ((o as SkinnedMesh).material as MeshLambertMaterial | undefined)?.map;
      if (map) gl.initTexture(map);
    });
  }, [gl, stage, camera, model]);
  const [rt] = useState(() => new CharacterRuntime());
  // hair: forward/back sway (side sway reuses the director's bouncy `sway` spring)
  const [hair] = useState(() => new SpringSet({ x: { value: 0, k: 45, c: 4 } }));

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    rig.step(delta);
    hair.step(delta);
    const g = (k: Parameters<Rig["get"]>[0]) => rig.get(k);
    const B = model.bones;

    // ---- secondary motion: hair lags behind body/head movement
    rig.impulse("sway", (-rig.velocity("headRz") * 0.9 - rig.velocity("rootX") * 3 + rig.velocity("rootY") * 1.2) * delta * 20);
    hair.impulse("x", (rig.velocity("rootY") * 1.5 - rig.velocity("spineRx") * 0.8 - rig.velocity("headRx") * 0.4) * delta * 20);

    // ---- root
    const root = rt.get("root");
    let rootX = g("rootX");
    let rootRz = 0;
    const squash = g("squash") * (1 + Math.sin(t * 2.4) * 0.01); // breathing
    if (layers.struggle > 0) {
      const s = layers.struggle;
      rootX += (Math.sin(t * 31) + Math.sin(t * 47)) * 0.0035 * s;
      rootRz = Math.sin(t * 23) * 0.04 * s;
    }
    if (root) {
      root.position.set(rootX, g("rootY"), 0);
      root.rotation.set(0, g("rootRy"), rootRz);
      root.scale.set(1 + (1 - squash) * 0.6, squash, 1 + (1 - squash) * 0.6);
    }
    B.hips.rotation.set(0, 0, g("hipsRz"));
    B.spine.rotation.set(g("spineRx"), 0, g("spineRz"));

    // ---- head (nods while talking: there is no mouth to animate)
    let headRz = g("headRz");
    let headRx = g("headRx");
    if (layers.struggle > 0) headRz += Math.sin(t * 17) * 0.05 * layers.struggle;
    if (layers.typing) headRx += Math.sin(t * 1.3) * 0.02;
    if (layers.talk) headRx += Math.sin(t * 9) * 0.035 * (0.6 + 0.4 * Math.sin(t * 4.3));
    B.head.rotation.set(headRx, g("headRy"), headRz);

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    // forward sway is limited: the hair would go through the backpack
    B.hair.rotation.set(clamp(0.03 + hair.get("x") + Math.sin(t * 1.7) * 0.015, -0.02, 0.22), 0, clamp(g("sway") * 0.3, -0.18, 0.18));

    // ---- arms
    let shLz = g("shLz") - ARM_SPLAY, elLz = g("elLz"), shRz = g("shRz") + ARM_SPLAY, elRz = g("elRz");
    let shLx = g("shLx"), shRx = g("shRx"), elLx = g("elLx"), elRx = g("elRx");
    let stretchL = 1, stretchR = 1;
    if (layers.climb) {
      // Gloves pinned on the screen edge (world y = GRIP_Y): solve in the shoulder plane.
      const sy = g("rootY") + SHOULDER.y;
      const jitter = layers.struggle * 0.006;
      const l = twoBoneIK(-SHOULDER.x, sy, -GRIP_X, GRIP_Y + Math.sin(t * 9) * jitter, UPPER_ARM, FOREARM, -1);
      const r = twoBoneIK(SHOULDER.x, sy, GRIP_X, GRIP_Y + Math.sin(t * 9 + 2) * jitter, UPPER_ARM, FOREARM, 1);
      shLz = l.shoulder; elLz = l.elbow; stretchL = Math.min(l.stretch, 1.9);
      shRz = r.shoulder; elRz = r.elbow; stretchR = Math.min(r.stretch, 1.9);
      shLx = shRx = elLx = elRx = 0;
    }
    if (layers.wave) {
      elRz += Math.sin(t * 11) * 0.45;
      shRz += Math.sin(t * 3.3) * 0.06;
    }
    if (layers.typing) {
      elLx += Math.max(0, Math.sin(t * 15)) * 0.12;
      elRx += Math.max(0, Math.sin(t * 15 + 2.1)) * 0.12;
    }
    B.shL.rotation.set(shLx, 0, shLz);
    B.shR.rotation.set(shRx, 0, shRz);
    B.shL.scale.set(1, stretchL, 1);
    B.shR.scale.set(1, stretchR, 1);
    B.elL.rotation.set(elLx, 0, elLz);
    B.elR.rotation.set(elRx, 0, elRz);

    // ---- legs
    let hipLx = g("hipLx"), hipRx = g("hipRx");
    if (layers.kick) {
      hipLx += Math.sin(t * 10) * 0.45;
      hipRx += Math.sin(t * 10 + Math.PI) * 0.45;
    }
    B.hipL.rotation.set(hipLx, 0, g("hipLz"));
    B.hipR.rotation.set(hipRx, 0, g("hipRz"));
    B.kneeL.rotation.set(g("kneeLx") + (layers.kick ? Math.max(0, Math.sin(t * 10 + 1)) * 0.6 : 0), 0, 0);
    B.kneeR.rotation.set(g("kneeRx") + (layers.kick ? Math.max(0, Math.sin(t * 10 + 1 + Math.PI)) * 0.6 : 0), 0, 0);

    // ---- laptop
    updateLaptop(rt.get("laptop"), rt.get("lid"), g("laptop"));
  });

  return (
    <group ref={rt.bind("root")}>
      <primitive object={model.root} />
      {/* laptop rides on the pelvis bone, resting on the thighs when seated */}
      {createPortal(
        <Laptop rootRef={rt.bind("laptop")} lidRef={rt.bind("lid")} position={[0, 0.05, 0.12]} scale={0.75} />,
        model.bones.hips,
      )}
    </group>
  );
}

useGLTF.preload(MASCOT_URL);
