import { SpringSet } from "./springs";

/**
 * Every animatable value of the 3D mascot: Euler angles (radians) or
 * positions (world units). The GLB model has no facial blendshapes, so there
 * are no face springs.
 */
const BODY = { k: 150, c: 15 };
const LIMB = { k: 210, c: 18 };

export const createRig = () =>
  new SpringSet({
    rootX: { value: 0.45, k: 80, c: 14 },
    rootY: { value: -1.4, k: 110, c: 13 },
    rootRy: { value: 0, k: 90, c: 13 },
    squash: { value: 1, k: 280, c: 11 },
    hipsRz: { value: 0, ...BODY },
    spineRx: { value: 0, ...BODY },
    spineRz: { value: 0, ...BODY },
    headRx: { value: 0, k: 140, c: 13 },
    headRy: { value: 0, k: 140, c: 13 },
    headRz: { value: 0, k: 140, c: 12 },
    shLz: { value: -0.12, ...LIMB },
    shLx: { value: 0, ...LIMB },
    elLz: { value: 0.1, ...LIMB },
    elLx: { value: 0, ...LIMB },
    shRz: { value: 0.12, ...LIMB },
    shRx: { value: 0, ...LIMB },
    elRz: { value: -0.1, ...LIMB },
    elRx: { value: 0, ...LIMB },
    hipLx: { value: 0, ...LIMB },
    hipLz: { value: 0, ...LIMB },
    kneeLx: { value: 0, ...LIMB },
    hipRx: { value: 0, ...LIMB },
    hipRz: { value: 0, ...LIMB },
    kneeRx: { value: 0, ...LIMB },
    laptop: { value: 0, k: 170, c: 15 },
    /** bouncy secondary motion (hair sway), driven only by impulses */
    sway: { value: 0, k: 60, c: 3.5 },
  });

export type Rig = ReturnType<typeof createRig>;
export type RigKey = Parameters<Rig["get"]>[0];

/** Procedural layers added on top of the springs every frame. */
export type Layers = {
  climb: boolean; // two-bone IK keeps the gloves on the screen edge
  struggle: number; // effort trembling amplitude
  kick: boolean; // legs scrambling while hanging
  wave: boolean; // right forearm waving
  typing: boolean;
  talk: boolean; // talking (head nods)
};

export const createLayers = (): Layers => ({
  climb: false,
  struggle: 0,
  kick: false,
  wave: false,
  typing: false,
  talk: false,
});

/**
 * Waving arm: upper arm at shoulder height, forearm up. The generated mesh has
 * the arms fused with the suit down the sides, so raising them straight up
 * stretches that shared surface; above shoulder height it shows.
 */
export const WAVE_ARM = { shRz: 1.35, elRz: 1.45 };
