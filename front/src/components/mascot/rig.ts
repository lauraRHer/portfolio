/**
 * Tiny physics "rig" for the mascot.
 *
 * Every joint is a damped spring chasing a target value. Changing a target
 * (e.g. "arm up") never snaps: the joint accelerates, overshoots a little
 * and settles, which is what makes the character feel alive instead of
 * robotic. Procedural layers (waving, typing, breathing, struggling) are
 * added on top of the spring values when the frame is rendered.
 */

export type Joint =
  | "x" // horizontal position of the feet (svg units, container space)
  | "y" // vertical offset below the standing position (+ = lower)
  | "rot" // whole-body tilt (deg, around the feet)
  | "squash" // vertical scale (1 = normal)
  | "head" // head tilt (deg)
  | "armL" // arm angles (deg, 0 = hanging down, clockwise positive)
  | "armR"
  | "legL"
  | "legR"
  | "laptop" // 0 = hidden, 1 = open on the lap
  | "lookX" // pupil offset (svg units)
  | "lookY"
  | "antenna"; // antenna sway (deg), driven only by impulses

type SpringCfg = { k: number; c: number };

const SPRINGS: Record<Joint, SpringCfg> = {
  x: { k: 90, c: 15 },
  y: { k: 120, c: 13 },
  rot: { k: 110, c: 12 },
  squash: { k: 260, c: 11 },
  head: { k: 140, c: 12 },
  armL: { k: 210, c: 17 },
  armR: { k: 210, c: 17 },
  legL: { k: 190, c: 16 },
  legR: { k: 190, c: 16 },
  laptop: { k: 160, c: 14 },
  lookX: { k: 300, c: 24 },
  lookY: { k: 300, c: 24 },
  antenna: { k: 70, c: 4 },
};

export type Layers = {
  /** Climbing: arms keep the hands pinned on the ledge (computed from y). */
  climb: boolean;
  /** Effort jitter amplitude (0 = none). */
  struggle: number;
  /** Legs scrambling while hanging. */
  kick: boolean;
  /** Right-arm wave. */
  wave: boolean;
  /** Hands typing on the laptop. */
  typing: boolean;
};

export const SHOULDER_Y = 88; // shoulder height above the feet
export const ARM_REACH = 33; // shoulder → glove center
export const LEDGE_Y = 250; // screen bottom in svg units
/** While climbing, gloves grip the ledge this far outside each shoulder (clear of the helmet). */
export const GRIP_OUT = 30;

export class Rig {
  value = {} as Record<Joint, number>;
  velocity = {} as Record<Joint, number>;
  target = {} as Record<Joint, number>;
  /** Per-joint stiffness multiplier for the current move (1 = default). */
  speed = {} as Record<Joint, number>;
  layers: Layers = { climb: false, struggle: 0, kick: false, wave: false, typing: false };
  time = 0;

  constructor(initial: Partial<Record<Joint, number>> = {}) {
    for (const j of Object.keys(SPRINGS) as Joint[]) {
      const v = initial[j] ?? (j === "squash" ? 1 : 0);
      this.value[j] = v;
      this.target[j] = v;
      this.velocity[j] = 0;
      this.speed[j] = 1;
    }
  }

  /** Move joints towards new targets. `speed` > 1 = snappier, < 1 = slower. */
  set(targets: Partial<Record<Joint, number>>, speed = 1) {
    for (const [j, v] of Object.entries(targets) as [Joint, number][]) {
      this.target[j] = v;
      this.speed[j] = speed;
    }
  }

  /** Jump instantly (no animation). */
  snap(values: Partial<Record<Joint, number>>) {
    for (const [j, v] of Object.entries(values) as [Joint, number][]) {
      this.value[j] = v;
      this.target[j] = v;
      this.velocity[j] = 0;
    }
  }

  /** Add velocity (e.g. landing squash, antenna boing). */
  kickJoint(j: Joint, impulse: number) {
    this.velocity[j] += impulse;
  }

  step(dtRaw: number) {
    const dt = Math.min(dtRaw, 1 / 30); // stay stable after tab switches
    this.time += dt;
    const prevHead = this.value.head;
    const prevX = this.value.x;
    const prevY = this.value.y;

    for (const j of Object.keys(SPRINGS) as Joint[]) {
      const { k, c } = SPRINGS[j];
      const s = this.speed[j];
      const kk = k * s * s;
      const cc = c * s;
      // semi-implicit Euler: stable and cheap
      this.velocity[j] += ((this.target[j] - this.value[j]) * kk - this.velocity[j] * cc) * dt;
      this.value[j] += this.velocity[j] * dt;
    }

    // Secondary motion: the antenna lags behind head and body movement.
    const dHead = this.value.head - prevHead;
    const dX = this.value.x - prevX;
    const dY = this.value.y - prevY;
    this.velocity.antenna += -dHead * 6 - dX * 3 + dY * 1.2;
  }

  /** Final pose for rendering = springs + procedural layers. */
  pose() {
    const v = this.value;
    const t = this.time;
    const L = this.layers;
    let armL = v.armL;
    let armR = v.armR;
    let legL = v.legL;
    let legR = v.legR;
    let x = v.x;
    let rot = v.rot;
    let squash = v.squash;
    let head = v.head;
    let stretchL = 1;
    let stretchR = 1;

    if (L.climb) {
      // Gloves stay pinned on the ledge, wide apart; cartoon arms stretch to reach.
      // Vector shoulder → glove in body space: (±GRIP_OUT, SHOULDER_Y - y).
      const dy = SHOULDER_Y - v.y;
      const len = Math.hypot(GRIP_OUT, dy);
      const a = (Math.atan2(GRIP_OUT, dy) * 180) / Math.PI; // clockwise from "down"
      const stretch = Math.max(0.75, Math.min(1.7, len / ARM_REACH));
      // tiny hand-over-hand shuffle
      armL = a + Math.sin(t * 7) * 4 * L.struggle;
      armR = -a + Math.sin(t * 7 + 1.7) * 4 * L.struggle;
      stretchL = stretch * (1 + Math.sin(t * 9) * 0.04 * L.struggle);
      stretchR = stretch * (1 + Math.sin(t * 9 + 2) * 0.04 * L.struggle);
    }
    if (L.struggle > 0) {
      // trembling effort: irregular, not a clean sine
      x += (Math.sin(t * 31) + Math.sin(t * 47)) * 0.7 * L.struggle;
      rot += Math.sin(t * 23) * 2.2 * L.struggle;
      head += Math.sin(t * 17) * 3 * L.struggle;
    }
    if (L.kick) {
      legL += Math.sin(t * 11) * 22;
      legR += Math.sin(t * 11 + Math.PI) * 22;
    }
    if (L.wave) {
      // fast, loose wave with a slower drift → reads as a happy, human wave
      armR += Math.sin(t * 10) * 18 + Math.sin(t * 3.1) * 4;
      head += Math.sin(t * 5) * 3;
    }
    if (L.typing) {
      armL += Math.max(0, Math.sin(t * 14)) * 7;
      armR += Math.max(0, Math.sin(t * 14 + 2.1)) * 7;
      head += Math.sin(t * 1.3) * 1.5;
    }
    // breathing
    squash *= 1 + Math.sin(t * 2.4) * 0.012;

    return { ...v, x, rot, squash, head, armL, armR, legL, legR, stretchL, stretchR };
  }
}
