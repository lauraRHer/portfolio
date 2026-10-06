/**
 * Analytic two-bone IK in the character's frontal (x, y) plane.
 *
 * Bones hang along -y at rest and rotate around z: an angle θ points the bone
 * in direction (sin θ, -cos θ). Returns the shoulder angle, the elbow angle
 * (relative to the upper bone) and a stretch factor (> 1 when the target is
 * out of reach: cartoon "rubber arms").
 */
export function twoBoneIK(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  upper: number,
  lower: number,
  bendSign: 1 | -1,
) {
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.hypot(dx, dy);
  const max = upper + lower;
  const stretch = dist > max * 0.999 ? dist / (max * 0.999) : 1;
  const d = Math.min(dist, max * 0.999);
  const toTarget = Math.atan2(dx, -dy);
  const cosA = (upper * upper + d * d - lower * lower) / (2 * upper * d);
  const cosB = (upper * upper + lower * lower - d * d) / (2 * upper * lower);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const b = Math.acos(Math.max(-1, Math.min(1, cosB)));
  return {
    shoulder: toTarget - bendSign * a,
    elbow: bendSign * (Math.PI - b),
    stretch,
  };
}
