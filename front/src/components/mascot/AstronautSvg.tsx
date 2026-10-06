/**
 * The mascot drawing: a chibi astronaut version of Laura (dark brown hair,
 * brown eyes) inside a glass helmet.
 *
 * Coordinates: feet at (0, 0), y up is negative. Every animated part
 * registers its DOM node through `bind(name)`; the render loop then writes
 * its transform directly (no React re-render per frame). Facial expressions
 * are discrete shapes switched with React state.
 */


export type Expression = "effort" | "relief" | "happy" | "talk" | "focus" | "curious";

export type PartName =
  | "body"
  | "head"
  | "armL"
  | "armR"
  | "legL"
  | "legR"
  | "laptop"
  | "antenna"
  | "pupils"
  | "lids"
  | "screenGlow";

/** Returns a stable callback ref that registers the node under `name`. */
export type Bind = (name: PartName) => (node: SVGElement | null) => void;

const C = {
  suit: "#ecebf7",
  suitShade: "#c9c5e3",
  suitDark: "#a59fca",
  trim: "#8b5cf6",
  glove: "#a78bfa",
  boot: "#5b4b8a",
  skin: "#f3c9a6",
  skinShade: "#e2ad88",
  hair: "#3b2416",
  hairLight: "#5a3825",
  iris: "#6b3e1f",
  pupil: "#24130a",
  blush: "#f08a9a",
  mouth: "#7a2b2b",
  tongue: "#ef6f87",
};

export function AstronautSvg({ bind, expression, mouthOpen }: { bind: Bind; expression: Expression; mouthOpen: boolean }) {
  return (
    <g ref={bind("body")}>
      {/* ---------- backpack ---------- */}
      <rect x="-31" y="-97" width="62" height="46" rx="12" fill={C.suitDark} />
      <rect x="-27" y="-60" width="10" height="6" rx="2" fill={C.trim} opacity="0.7" />

      {/* ---------- legs (pivot at the hips) ---------- */}
      <g transform="translate(-9 -50)">
        <g ref={bind("legL")}>
          <Leg />
        </g>
      </g>
      <g transform="translate(9 -50)">
        <g ref={bind("legR")}>
          <Leg />
        </g>
      </g>

      {/* ---------- torso ---------- */}
      <rect x="-24" y="-99" width="48" height="56" rx="17" fill={C.suit} />
      <path d="M -24 -60 Q 0 -54 24 -60 L 24 -52 Q 0 -46 -24 -52 Z" fill={C.suitShade} />
      {/* chest panel */}
      <rect x="-11" y="-86" width="22" height="15" rx="4" fill="#1c1c2e" />
      <circle cx="-5" cy="-78.5" r="2.4" fill="#22d3ee" />
      <circle cx="1" cy="-78.5" r="2.4" fill="#e040fb" />
      <rect x="5" y="-81" width="3" height="5" rx="1" fill="#34d399" />
      {/* collar */}
      <ellipse cx="0" cy="-100" rx="21" ry="6" fill={C.suitShade} />

      {/* ---------- laptop (on the lap when seated) ---------- */}
      <g ref={bind("laptop")}>
        <rect x="-46" y="-63" width="40" height="5" rx="2" fill="#9ca3b8" />
        {/* lid seen from behind, tilted towards her */}
        <path d="M -44 -62 L -16 -62 L -22 -91 L -50 -91 Z" fill="#c3c7d6" stroke="#9ca3b8" strokeWidth="1" />
        <path d="M -33 -80 l 1.6 3.4 3.7 .5 -2.7 2.6 .7 3.7 -3.3 -1.8 -3.3 1.8 .7 -3.7 -2.7 -2.6 3.7 -.5 Z" fill="#e040fb" />
      </g>

      {/* ---------- arms (pivot at the shoulders) ---------- */}
      <g transform="translate(-22 -88)">
        <g ref={bind("armL")}>
          <Arm />
        </g>
      </g>
      <g transform="translate(22 -88)">
        <g ref={bind("armR")}>
          <Arm />
        </g>
      </g>

      {/* ---------- head (pivot at the neck) ---------- */}
      <g transform="translate(0 -102)">
        <g ref={bind("head")}>
          {/* antenna */}
          <g transform="translate(14 -78)">
            <g ref={bind("antenna")}>
              <line x1="0" y1="0" x2="0" y2="-16" stroke={C.suitDark} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="0" cy="-18" r="4.5" fill="#e040fb" />
              <circle cx="-1.3" cy="-19.3" r="1.4" fill="#fff" opacity="0.8" />
            </g>
          </g>

          {/* hair, back layer */}
          <path d="M -30 -36 C -32 -66 32 -66 30 -36 L 31 -6 C 24 2 18 -2 16 -8 L -16 -8 C -18 -2 -24 2 -31 -6 Z" fill={C.hair} />

          {/* face */}
          <ellipse cx="0" cy="-32" rx="25" ry="26" fill={C.skin} />
          {/* laptop light on the face */}
          <ellipse ref={bind("screenGlow")} cx="-12" cy="-26" rx="20" ry="18" fill="#22d3ee" opacity="0" />

          {/* bangs */}
          <path d="M -26 -40 C -26 -62 22 -66 27 -44 C 18 -52 6 -50 -2 -56 C -6 -48 -16 -46 -26 -40 Z" fill={C.hair} />
          <path d="M -2 -56 C 4 -50 14 -50 22 -50" stroke={C.hairLight} strokeWidth="1.6" fill="none" strokeLinecap="round" />

          <Face expression={expression} mouthOpen={mouthOpen} bind={bind} />

          {/* helmet glass */}
          <circle cx="0" cy="-36" r="44" fill="rgb(180 215 255 / 0.10)" stroke="rgb(210 230 255 / 0.55)" strokeWidth="2.5" />
          <path d="M -30 -62 A 38 38 0 0 1 -6 -76" stroke="#fff" strokeOpacity="0.7" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="-36" cy="-48" r="2.5" fill="#fff" opacity="0.6" />
        </g>
      </g>
    </g>
  );
}

function Leg() {
  return (
    <>
      <rect x="-7.5" y="-2" width="15" height="34" rx="7" fill={C.suit} />
      <rect x="-7.5" y="14" width="15" height="4" fill={C.suitShade} />
      <path d="M -9 28 h 17 a 5 5 0 0 1 5 5 v 3 h -22 z" fill={C.boot} />
    </>
  );
}

function Arm() {
  return (
    <>
      <rect x="-6.5" y="-3" width="13" height="30" rx="6.5" fill={C.suit} />
      <rect x="-6.5" y="17" width="13" height="4" fill={C.trim} opacity="0.8" />
      <circle cx="0" cy="33" r="8" fill={C.glove} />
      <circle cx="-3" cy="31" r="2" fill="#fff" opacity="0.35" />
    </>
  );
}

function Face({ expression, mouthOpen, bind }: { expression: Expression; mouthOpen: boolean; bind: Bind }) {
  const effort = expression === "effort";
  const relief = expression === "relief";

  // Brows: inner ends down = frown (effort/focus), raised = curious/happy.
  const brow = {
    effort: { l: "M -16 -45 L -5 -41", r: "M 16 -45 L 5 -41" },
    focus: { l: "M -16 -45 Q -10 -45 -5 -43", r: "M 16 -45 Q 10 -45 5 -43" },
    curious: { l: "M -16 -47 Q -10 -51 -5 -48", r: "M 16 -47 Q 10 -51 5 -48" },
    relief: { l: "M -16 -46 Q -10 -49 -5 -47", r: "M 16 -46 Q 10 -49 5 -47" },
    happy: { l: "M -16 -46 Q -10 -49 -5 -47", r: "M 16 -46 Q 10 -49 5 -47" },
    talk: { l: "M -16 -46 Q -10 -50 -5 -47", r: "M 16 -46 Q 10 -50 5 -47" },
  }[expression];

  return (
    <g>
      {/* blush */}
      <ellipse cx="-16" cy="-24" rx="4.5" ry="2.6" fill={C.blush} opacity={effort ? 0.75 : 0.45} />
      <ellipse cx="16" cy="-24" rx="4.5" ry="2.6" fill={C.blush} opacity={effort ? 0.75 : 0.45} />

      {/* eyes */}
      {relief ? (
        <g stroke={C.pupil} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M -15 -33 Q -10 -37 -5 -33" />
          <path d="M 15 -33 Q 10 -37 5 -33" />
        </g>
      ) : (
        <g>
          <ellipse cx="-10" cy="-33" rx="5.6" ry={effort ? 4 : 6.6} fill="#fff" />
          <ellipse cx="10" cy="-33" rx="5.6" ry={effort ? 4 : 6.6} fill="#fff" />
          <g ref={bind("pupils")}>
            <circle cx="-10" cy="-32.5" r="4.2" fill={C.iris} />
            <circle cx="10" cy="-32.5" r="4.2" fill={C.iris} />
            <circle cx="-10" cy="-32.5" r="2.1" fill={C.pupil} />
            <circle cx="10" cy="-32.5" r="2.1" fill={C.pupil} />
            <circle cx="-8.6" cy="-34.4" r="1.3" fill="#fff" />
            <circle cx="11.4" cy="-34.4" r="1.3" fill="#fff" />
          </g>
          {/* eyelids (scaled by the blink) */}
          <g ref={bind("lids")}>
            <ellipse cx="-10" cy="-33" rx="6.4" ry="7.4" fill={C.skin} />
            <ellipse cx="10" cy="-33" rx="6.4" ry="7.4" fill={C.skin} />
          </g>
          {effort && (
            <g fill={C.skin}>
              <rect x="-17" y="-40" width="14" height="4" />
              <rect x="3" y="-40" width="14" height="4" />
            </g>
          )}
        </g>
      )}

      {/* brows */}
      <g stroke={C.hair} strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d={brow.l} style={{ transition: "d .18s" }} />
        <path d={brow.r} style={{ transition: "d .18s" }} />
      </g>

      {/* mouth */}
      {effort && (
        <g>
          {/* clenched, wobbly mouth + tongue out to the side */}
          <path d="M -7 -18 Q -4 -20.5 -1 -18 Q 2 -15.5 5 -18" stroke={C.mouth} strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="6.5" cy="-15.5" rx="3.2" ry="4.6" fill={C.tongue} transform="rotate(-30 6.5 -15.5)" />
          <path d="M 6 -17 l 1.2 3.5" stroke="#c94f68" strokeWidth="0.8" />
          {/* sweat drop */}
          <path className="mascot-sweat" d="M 22 -52 q 4 6 0 8 q -4 -2 0 -8 Z" fill="#7dd3fc" />
        </g>
      )}
      {relief && <ellipse cx="2" cy="-18" rx="3.2" ry="2.6" fill={C.mouth} />}
      {(expression === "happy" || (expression === "talk" && !mouthOpen)) && (
        <path d="M -6.5 -20 Q 0 -13.5 6.5 -20" stroke={C.mouth} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
      {expression === "talk" && mouthOpen && (
        <g>
          <path d="M -6.5 -21 Q 0 -10 6.5 -21 Z" fill={C.mouth} />
          <ellipse cx="0" cy="-14.8" rx="3.3" ry="1.8" fill={C.tongue} />
        </g>
      )}
      {expression === "focus" && <path d="M -3.5 -18.5 Q 0 -17 3.5 -18.5" stroke={C.mouth} strokeWidth="2" fill="none" strokeLinecap="round" />}
      {expression === "curious" && <ellipse cx="0" cy="-18" rx="2.6" ry="3.2" fill={C.mouth} />}
    </g>
  );
}
