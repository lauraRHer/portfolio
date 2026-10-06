/**
 * A bag of named damped springs. Each value chases its target with its own
 * stiffness (k) and damping (c): poses blend with inertia and a little
 * overshoot, which is what makes motion read as organic instead of tweened.
 */
export type SpringCfg = { k: number; c: number };

type Spring = { v: number; vel: number; target: number; k: number; c: number; speed: number };

export class SpringSet<K extends string> {
  private s = {} as Record<K, Spring>;

  constructor(defs: Record<K, { value: number } & SpringCfg>) {
    for (const key of Object.keys(defs) as K[]) {
      const d = defs[key];
      this.s[key] = { v: d.value, vel: 0, target: d.value, k: d.k, c: d.c, speed: 1 };
    }
  }

  get(key: K) {
    return this.s[key].v;
  }

  velocity(key: K) {
    return this.s[key].vel;
  }

  /** New targets; `speed` > 1 snappier, < 1 lazier (scales k by speed², c by speed). */
  set(targets: Partial<Record<K, number>>, speed = 1) {
    for (const [key, t] of Object.entries(targets) as [K, number][]) {
      this.s[key].target = t;
      this.s[key].speed = speed;
    }
  }

  snap(values: Partial<Record<K, number>>) {
    for (const [key, v] of Object.entries(values) as [K, number][]) {
      const sp = this.s[key];
      sp.v = v;
      sp.target = v;
      sp.vel = 0;
    }
  }

  impulse(key: K, dv: number) {
    this.s[key].vel += dv;
  }

  /**
   * Advance the simulation in real time. Large frame gaps (slow devices) are
   * split into ≤ 1/60 s sub-steps, so the motion never runs in slow motion and
   * stays stable; gaps over 0.25 s (tab in background) are dropped.
   */
  step(dtRaw: number) {
    let remaining = Math.min(dtRaw, 0.25);
    while (remaining > 1e-6) {
      const dt = Math.min(remaining, 1 / 60);
      remaining -= dt;
      this.integrate(dt);
    }
  }

  private integrate(dt: number) {
    for (const key in this.s) {
      const sp = this.s[key];
      const k = sp.k * sp.speed * sp.speed;
      const c = sp.c * sp.speed;
      sp.vel += ((sp.target - sp.v) * k - sp.vel * c) * dt;
      sp.v += sp.vel * dt;
    }
  }
}
