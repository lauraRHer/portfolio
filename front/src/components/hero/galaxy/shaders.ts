/**
 * GLSL for the galaxy particles.
 *
 * Interactions handled on the GPU (no per-particle JS work):
 *  - hover: particles near `uMouse` are pushed away radially and brighten
 *  - click: a shockwave ring expands from `uClickPos` (age = `uClickAge`)
 *  - twinkle + slow differential swirl
 *  - `uFade` fades the whole galaxy at the end of the star dive
 */
export const galaxyVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3  uMouse;
  uniform float uHover;
  uniform float uHoverRadius;
  uniform vec3  uClickPos;
  uniform float uClickAge;

  attribute float aScale;
  attribute vec3  aRandom;

  varying vec3  vColor;
  varying float vBoost;

  void main() {
    vec3 p = position;

    // Gentle differential swirl: inner stars move a bit faster.
    float dist = length(p.xz);
    float swirl = 0.06 * sin(uTime * 0.25 + aRandom.x * 6.2831) / (dist + 0.8);
    float c = cos(swirl), s = sin(swirl);
    p.xz = mat2(c, -s, s, c) * p.xz;

    // Hover repulsion.
    vec2 fromMouse = p.xz - uMouse.xz;
    float dMouse = length(fromMouse);
    float hover = smoothstep(uHoverRadius, 0.0, dMouse) * uHover;
    // subtle on purpose: a gentle "make way" + soft glow, not a crater
    p.xz += normalize(fromMouse + 1e-5) * hover * 0.12;
    p.y  += hover * 0.06 * aRandom.y;

    // Click shockwave.
    float dClick = length(p.xz - uClickPos.xz);
    float ring = uClickAge * 3.2;
    float wave = exp(-pow((dClick - ring) * 2.6, 2.0)) * exp(-uClickAge * 1.3);
    wave *= step(0.0, uClickAge);
    p.xz += normalize(p.xz - uClickPos.xz + 1e-5) * wave * 0.35;
    p.y  += wave * 0.45 * aRandom.y;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float twinkle = 0.75 + 0.25 * sin(uTime * (1.5 + aRandom.z * 2.5) + aRandom.x * 40.0);
    vBoost = hover * 0.35 + wave * 1.8;

    gl_PointSize = uSize * aScale * uPixelRatio * twinkle * (1.0 + vBoost * 0.6);
    gl_PointSize *= 1.0 / max(-mvPosition.z, 0.05);
    gl_PointSize = min(gl_PointSize, 64.0 * uPixelRatio);

    vColor = color;
  }
`;

export const galaxyFragmentShader = /* glsl */ `
  uniform float uFade;
  varying vec3  vColor;
  varying float vBoost;

  void main() {
    // Soft round sprite with a hot center.
    float d = distance(gl_PointCoord, vec2(0.5));
    float strength = pow(1.0 - clamp(d * 2.0, 0.0, 1.0), 3.0);
    if (strength < 0.01) discard;

    vec3 col = mix(vColor, vec3(1.0), clamp(vBoost * 0.45, 0.0, 0.8));
    gl_FragColor = vec4(col * strength * (1.0 + vBoost), strength * uFade);
  }
`;

/** Billboard glow used for the target star we dive into. */
export const starGlowVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const starGlowFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c);
    float core = smoothstep(0.08, 0.0, d);
    float halo = pow(smoothstep(0.5, 0.0, d), 2.4);
    // Four-point diffraction spikes.
    float spikes = (smoothstep(0.012, 0.0, abs(c.x)) + smoothstep(0.012, 0.0, abs(c.y))) * smoothstep(0.5, 0.0, d);
    float pulse = 0.85 + 0.15 * sin(uTime * 2.2);

    vec3 violet = vec3(0.545, 0.361, 0.965);
    vec3 magenta = vec3(0.878, 0.251, 0.984);
    vec3 col = mix(violet, magenta, smoothstep(0.35, 0.0, d)) * halo * 1.4 + vec3(1.0) * (core + spikes * 0.6);

    float alpha = clamp(core + halo + spikes * 0.5, 0.0, 1.0) * pulse * uIntensity;
    gl_FragColor = vec4(col * pulse * uIntensity, alpha);
  }
`;
