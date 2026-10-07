/**
 * Auto-rigs the AI-generated astronaut (a static textured mesh with no
 * skeleton) so the existing mascot director can animate it.
 *
 *   node scripts/rig-mascot.mjs [input.glb] [output.glb]
 *
 * Defaults: assets/mascot/meshy_mascot.glb → public/models/mascot.glb
 *
 * Source model: generated with Meshy (free plan, CC BY 4.0 — attribution in
 * the site footer and README).
 *
 * What it does:
 *  1. Normalises the mesh: feet on y = 0, body centred on x = z = 0, ×SCALE.
 *  2. Builds a skeleton with the same joints as the procedural character
 *     (hips, spine, head, shL/elL, shR/elR, hipL/kneeL, hipR/kneeR) plus a
 *     `hair` bone for secondary motion. Limb bones are oriented so their
 *     local -y runs along the limb: the director's angles (rest = limb hanging
 *     straight down) apply unchanged.
 *  3. Computes skin weights by regions: hair is detected from the texture
 *     colour (dark brown) and only follows head/spine/hair, never the arms;
 *     limbs blend across shoulders, elbows, hips and knees along their axis.
 *  4. Simplifies the mesh first (meshoptimizer), then shrinks the textures
 *     (1024 px WebP) and quantises the geometry.
 *
 * JOINTS are measured on *this* mesh (raw coordinates, model facing +z).
 * A new model needs new measurements: see docs/guides/mascota-3d.md.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, quantize, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Matrix4, Quaternion, Vector3 } from "three";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2] ?? path.join(root, "assets/mascot/meshy_mascot.glb");
const output = process.argv[3] ?? path.join(root, "public/models/mascot.glb");

// ---------------------------------------------------------------- measurements (raw model space)
/** Raw point that becomes the origin: between the soles, at the body's depth centre. */
const ORIGIN = [0, -0.951, 0.1];
/** Raw → world units. 0.52 makes her ≈ 1 unit tall, like the procedural astronaut. */
const SCALE = 0.52;
/**
 * Torso half-width: closer to the axis it's suit, not sleeve. The lowered arms
 * touch the hips, so without this the forearm would drag the suit along.
 */
const TORSO_HALF_WIDTH = 0.25;
/** The backpack starts behind this depth: never part of the arms. */
const BACKPACK_FRONT = -0.11;
/**
 * Forehead mole, painted into the albedo: image-to-3D generators drop such
 * small details. `at` is (x, y) in raw model space, seen from the front.
 */
const MOLE = { at: [-0.07, 0.665], radius: 0.013, colour: [70, 40, 32] };
/** Texels each UV island is grown by before downscaling (avoids light seams). */
const GUTTER = 16;
/** Fraction of triangles kept by the simplifier (the raw mesh has ~150k). */
const SIMPLIFY_RATIO = 0.35;

const JOINTS = {
  hips: [0, -0.33, 0.1],
  spine: [0, -0.2, 0.08],
  head: [0, 0.22, 0.08],
  hair: [0, 0.32, -0.08],
  shL: [-0.22, 0.07, 0.09],
  elL: [-0.31, -0.09, 0.12],
  handL: [-0.42, -0.27, 0.165], // glove centre (end of the chain, not a bone)
  tipL: [-0.5, -0.36, 0.17], // glove fingertips
  hipL: [-0.13, -0.36, 0.11],
  kneeL: [-0.15, -0.57, 0.11],
  ankleL: [-0.2, -0.83, 0.09], // end of the chain, not a bone
};
for (const k of ["shL", "elL", "handL", "tipL", "hipL", "kneeL", "ankleL"]) {
  const [x, y, z] = JOINTS[k];
  JOINTS[k.replace("L", "R")] = [-x, y, z];
}

/** Bone tree: name → [parent, orientation target (limb bones point -y at it)]. */
const BONES = {
  hips: [null, null],
  spine: ["hips", null],
  head: ["spine", null],
  hair: ["spine", null],
  shL: ["spine", "elL"],
  elL: ["shL", "handL"],
  shR: ["spine", "elR"],
  elR: ["shR", "handR"],
  hipL: ["hips", "kneeL"],
  kneeL: ["hipL", "ankleL"],
  hipR: ["hips", "kneeR"],
  kneeR: ["hipR", "ankleR"],
};
const BONE_NAMES = Object.keys(BONES);
const B = Object.fromEntries(BONE_NAMES.map((n, i) => [n, i]));

// ---------------------------------------------------------------- helpers
const toWorld = ([x, y, z]) => new Vector3((x - ORIGIN[0]) * SCALE, (y - ORIGIN[1]) * SCALE, (z - ORIGIN[2]) * SCALE);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.sqrt(dot(a, a));

/**
 * Distance from p to the polyline `pts` and the arc length of the closest
 * point measured from pts[0] (negative before the start).
 */
function polyline(p, pts) {
  let best = { d: Infinity, u: 0 };
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const ab = sub(pts[i + 1], pts[i]);
    const L = len(ab);
    const raw = dot(sub(p, pts[i]), ab) / (L * L);
    const t = i === 0 ? Math.min(1, raw) : Math.min(1, Math.max(0, raw)); // first segment extends backwards
    const q = [pts[i][0] + ab[0] * t, pts[i][1] + ab[1] * t, pts[i][2] + ab[2] * t];
    const d = len(sub(p, q));
    if (d < best.d) best = { d, u: acc + t * L };
    acc += L;
  }
  return best;
}

/** Hair = dark warm brown in the albedo texture (the suit is white/cyan, skin is light). */
const isHairColour = (r, g, b) => r > g && g >= b && Math.max(r, g, b) < 140;

// ---------------------------------------------------------------- weights (raw space)
function weightsFor(p, hairColour) {
  const [x, y, z] = p;
  const w = new Float32Array(BONE_NAMES.length);

  // Hair: rigid with the head on top, spine + swaying hair bone further down.
  const hair = hairColour && y > -0.5 && (y > 0.2 || z < 0.02 || Math.abs(x) > 0.22);
  if (hair) {
    const head = smooth(0.12, 0.32, y);
    const sway = (1 - head) * smooth(0.2, -0.15, y);
    w[B.head] = head;
    w[B.hair] = sway;
    w[B.spine] = 1 - head - sway;
    return w;
  }

  // Arms (never the backpack, which sits behind the back).
  for (const s of ["L", "R"]) {
    const sh = JOINTS[`sh${s}`], el = JOINTS[`el${s}`];
    const { d, u } = polyline(p, [sh, el, JOINTS[`hand${s}`], JOINTS[`tip${s}`]]);
    const side = s === "L" ? -x : x;
    const upper = len(sub(el, sh));
    const radius = u > upper ? 0.13 : 0.1; // the mittens are chunkier than the sleeves
    const mitten = len(sub(p, JOINTS[`hand${s}`])) < 0.15; // incl. the thumb pointing inwards
    if (z > BACKPACK_FRONT && (d < radius || mitten) && u > -0.03 && side > TORSO_HALF_WIDTH) {
      // where the sleeve is fused with the suit (hips), hand over to the torso
      // gradually so the joining triangles stretch smoothly instead of tearing
      const body = Math.max(1 - smooth(-0.03, 0.05, u), 1 - smooth(TORSO_HALF_WIDTH, TORSO_HALF_WIDTH + 0.05, side));
      const fore = smooth(upper - 0.04, upper + 0.04, u);
      w[B.spine] = body;
      w[B[`el${s}`]] = (1 - body) * fore;
      w[B[`sh${s}`]] = (1 - body) * (1 - fore);
      return w;
    }
  }

  // Legs, blended 50/50 on the crotch midline (the backpack corners stay with the torso).
  if (y < -0.47 || (y < -0.33 && Math.abs(x) < 0.26)) {
    let legs = 0;
    for (const s of ["L", "R"]) {
      const side = smooth(-0.04, 0.04, s === "L" ? -x : x);
      if (side === 0) continue;
      const hip = JOINTS[`hip${s}`], knee = JOINTS[`knee${s}`], ankle = JOINTS[`ankle${s}`];
      const { u } = polyline(p, [hip, knee, ankle]);
      const thighLen = len(sub(knee, hip));
      // the seat (behind the leg axis) stays with the pelvis when the thighs swing forward
      const back = smooth(0.08, -0.02, z);
      const pelvis = 1 - smooth(-0.05 + 0.1 * back, 0.05 + 0.12 * back, u);
      const shin = smooth(thighLen - 0.05, thighLen + 0.05, u);
      w[B.hips] += side * pelvis;
      w[B[`knee${s}`]] += side * (1 - pelvis) * shin;
      w[B[`hip${s}`]] += side * (1 - pelvis) * (1 - shin);
      legs += side;
    }
    if (legs > 0) return w;
  }

  // Torso column (incl. backpack): hips → spine → head by height.
  const spine = smooth(-0.3, -0.17, y);
  const head = smooth(0.19, 0.27, y);
  w[B.hips] = 1 - spine;
  w[B.spine] = spine * (1 - head);
  w[B.head] = spine * head;
  return w;
}

/** Paints MOLE into the raw RGB(A) pixels `px`; returns how many texels it touched. */
function paintMole(px, info, pos, uv, idx) {
  const [mx, my] = MOLE.at;
  const r = MOLE.radius;
  // depth of the forehead surface at the mole (front-most vertex around it)
  let mz = -Infinity;
  for (let i = 0; i < pos.length / 3; i++) {
    if (Math.hypot(pos[i * 3] - mx, pos[i * 3 + 1] - my) < 0.02) mz = Math.max(mz, pos[i * 3 + 2]);
  }
  const { width: W, height: H, channels: C } = info;
  let count = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]];
    const P = v.map((i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]);
    if (P.every((q) => Math.hypot(q[0] - mx, q[1] - my, q[2] - mz) > r * 6)) continue;
    const U = v.map((i) => [uv[i * 2] * W, uv[i * 2 + 1] * H]);
    const d = (U[1][1] - U[2][1]) * (U[0][0] - U[2][0]) + (U[2][0] - U[1][0]) * (U[0][1] - U[2][1]);
    if (Math.abs(d) < 1e-12) continue;
    const xs = U.map((u) => u[0]), ys = U.map((u) => u[1]);
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.ceil(Math.max(...ys))); y++) {
      for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(W - 1, Math.ceil(Math.max(...xs))); x++) {
        const a = ((U[1][1] - U[2][1]) * (x + 0.5 - U[2][0]) + (U[2][0] - U[1][0]) * (y + 0.5 - U[2][1])) / d;
        const b = ((U[2][1] - U[0][1]) * (x + 0.5 - U[2][0]) + (U[0][0] - U[2][0]) * (y + 0.5 - U[2][1])) / d;
        const c = 1 - a - b;
        if (a < -0.01 || b < -0.01 || c < -0.01) continue;
        const q = [0, 1, 2].map((k) => a * P[0][k] + b * P[1][k] + c * P[2][k]);
        const alpha = 1 - smooth(r * 0.55, r, Math.hypot(q[0] - mx, q[1] - my, q[2] - mz));
        if (alpha <= 0) continue;
        const o = (y * W + x) * C;
        for (let k = 0; k < 3; k++) px[o + k] = Math.round(px[o + k] * (1 - alpha) + MOLE.colour[k] * alpha);
        count++;
      }
    }
  }
  return count;
}

/** Texels covered by some triangle in UV space. */
function uvCoverage(W, H, uv, idx) {
  const mask = new Uint8Array(W * H);
  for (let t = 0; t < idx.length; t += 3) {
    const U = [idx[t], idx[t + 1], idx[t + 2]].map((i) => [uv[i * 2] * W, uv[i * 2 + 1] * H]);
    const d = (U[1][1] - U[2][1]) * (U[0][0] - U[2][0]) + (U[2][0] - U[1][0]) * (U[0][1] - U[2][1]);
    if (Math.abs(d) < 1e-12) continue;
    const xs = U.map((u) => u[0]), ys = U.map((u) => u[1]);
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.ceil(Math.max(...ys))); y++) {
      for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(W - 1, Math.ceil(Math.max(...xs))); x++) {
        const a = ((U[1][1] - U[2][1]) * (x + 0.5 - U[2][0]) + (U[2][0] - U[1][0]) * (y + 0.5 - U[2][1])) / d;
        const b = ((U[2][1] - U[0][1]) * (x + 0.5 - U[2][0]) + (U[0][0] - U[2][0]) * (y + 0.5 - U[2][1])) / d;
        if (a >= -0.02 && b >= -0.02 && 1 - a - b >= -0.02) mask[y * W + x] = 1;
      }
    }
  }
  return mask;
}

/** Fills uncovered texels with the average of covered neighbours, GUTTER rings deep. */
function dilate(px, { width: W, height: H, channels: C }, mask) {
  for (let step = 0; step < GUTTER; step++) {
    const grown = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (mask[y * W + x]) continue;
        const sum = new Array(C).fill(0);
        let n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= W || Y >= H || !mask[Y * W + X]) continue;
          for (let k = 0; k < C; k++) sum[k] += px[(Y * W + X) * C + k];
          n++;
        }
        if (n) grown.push([y * W + x, sum.map((v) => v / n)]);
      }
    }
    if (!grown.length) break;
    for (const [i, c] of grown) {
      for (let k = 0; k < C; k++) px[i * C + k] = Math.round(c[k]);
      mask[i] = 1;
    }
  }
}

/** Keeps the 4 largest influences, normalised (glTF limit for one JOINTS/WEIGHTS set). */
function top4(w) {
  const order = [...w.keys()].sort((a, b) => w[b] - w[a]).slice(0, 4);
  const sum = order.reduce((a, i) => a + w[i], 0) || 1;
  return { joints: order, weights: order.map((i) => w[i] / sum) };
}

// ---------------------------------------------------------------- main
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ sharp });
const doc = await io.read(input);
const gltf = doc.getRoot();
const meshes = gltf.listMeshes();
if (meshes.length !== 1 || meshes[0].listPrimitives().length !== 1) throw new Error("expected a single mesh primitive");
if (gltf.listSkins().length) throw new Error("input already has a skin");
// fewer triangles before skinning: weights are computed on the final vertices
await MeshoptSimplifier.ready;
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: SIMPLIFY_RATIO, error: 0.001 }));
const prim = meshes[0].listPrimitives()[0];

// albedo pixels for the hair classification
const albedo = prim.getMaterial().getBaseColorTexture();
const { data: px, info } = await sharp(Buffer.from(albedo.getImage())).raw().toBuffer({ resolveWithObject: true });
const colourAt = (u, v) => {
  const x = Math.min(info.width - 1, Math.floor(u * info.width));
  const y = Math.min(info.height - 1, Math.floor(v * info.height));
  const k = (y * info.width + x) * info.channels;
  return [px[k], px[k + 1], px[k + 2]];
};

const posAcc = prim.getAttribute("POSITION");
const uvAcc = prim.getAttribute("TEXCOORD_0");
const n = posAcc.getCount();
const pos = posAcc.getArray();
const uv = uvAcc.getArray();

// the mole is painted in 3D (texel → surface point), so it stays round even
// where the forehead is split across several UV islands
const molePixels = paintMole(px, info, pos, uv, prim.getIndices().getArray());
albedo.setImage(await sharp(px, { raw: info }).png().toBuffer()).setMimeType("image/png");
const joints = new Uint8Array(n * 4);
const weights = new Float32Array(n * 4);
let hairCount = 0;
for (let i = 0; i < n; i++) {
  const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  const hairColour = isHairColour(...colourAt(uv[i * 2], uv[i * 2 + 1]));
  if (hairColour) hairCount++;
  const { joints: j, weights: wt } = top4(weightsFor(p, hairColour));
  joints.set(j, i * 4);
  weights.set(wt, i * 4);
  // bake the normalisation into the vertices
  const q = toWorld(p);
  pos[i * 3] = q.x;
  pos[i * 3 + 1] = q.y;
  pos[i * 3 + 2] = q.z;
}
posAcc.setArray(pos);
const buffer = gltf.listBuffers()[0];
prim.setAttribute("JOINTS_0", doc.createAccessor("joints").setType("VEC4").setArray(joints).setBuffer(buffer));
prim.setAttribute("WEIGHTS_0", doc.createAccessor("weights").setType("VEC4").setArray(weights).setBuffer(buffer));

// skeleton: world bind matrices → local TRS + inverse bind matrices
const worldMat = {};
const nodes = {};
for (const name of BONE_NAMES) {
  const [parent, aim] = BONES[name];
  const at = toWorld(JOINTS[name]);
  const rot = new Quaternion();
  if (aim) rot.setFromUnitVectors(new Vector3(0, -1, 0), toWorld(JOINTS[aim]).sub(at).normalize());
  worldMat[name] = new Matrix4().compose(at, rot, new Vector3(1, 1, 1));
  const local = parent ? new Matrix4().copy(worldMat[parent]).invert().multiply(worldMat[name]) : worldMat[name].clone();
  const t = new Vector3(), r = new Quaternion(), s = new Vector3();
  local.decompose(t, r, s);
  nodes[name] = doc.createNode(name).setTranslation(t.toArray()).setRotation(r.toArray());
  if (parent) nodes[parent].addChild(nodes[name]);
}
const ibm = new Float32Array(BONE_NAMES.length * 16);
BONE_NAMES.forEach((name, i) => ibm.set(new Matrix4().copy(worldMat[name]).invert().elements, i * 16));
const skin = doc.createSkin("mascot").setSkeleton(nodes.hips);
for (const name of BONE_NAMES) skin.addJoint(nodes[name]);
skin.setInverseBindMatrices(doc.createAccessor("inverseBind").setType("MAT4").setArray(ibm).setBuffer(buffer));

// scene: [hips skeleton, skinned body]
const scene = gltf.getDefaultScene() ?? gltf.listScenes()[0];
for (const child of scene.listChildren()) scene.removeChild(child);
for (const node of gltf.listNodes()) if (!BONE_NAMES.includes(node.getName())) node.dispose();
scene.addChild(nodes.hips).addChild(doc.createNode("body").setMesh(meshes[0]).setSkin(skin));
meshes[0].setName("body");
prim.getMaterial().setName("mascot");

// grow every UV island into the empty space around it: downscaled textures
// and mipmaps blend across island borders, which shows up as light seams
const material = prim.getMaterial();
// The normal map is dropped: without baked tangents it draws light streaks along
// the UV seams across the face, and on a cartoon character it adds almost nothing.
material.setNormalTexture(null);
for (const tex of [material.getBaseColorTexture(), material.getMetallicRoughnessTexture()]) {
  if (!tex) continue;
  const { data, info: ti } = await sharp(Buffer.from(tex.getImage())).raw().toBuffer({ resolveWithObject: true });
  dilate(data, ti, uvCoverage(ti.width, ti.height, uv, prim.getIndices().getArray()));
  tex.setImage(await sharp(data, { raw: ti }).png().toBuffer()).setMimeType("image/png");
}

await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024] }),
  quantize(),
  dedup(),
  prune(),
);
await io.write(output, doc);

console.log(`${n} vertices (${hairCount} hair), ${BONE_NAMES.length} bones, mole ${molePixels} texels → ${path.relative(root, output)}`);
console.log(
  "world joints:",
  Object.fromEntries(Object.keys(JOINTS).map((k) => [k, toWorld(JOINTS[k]).toArray().map((v) => +v.toFixed(3))])),
);
