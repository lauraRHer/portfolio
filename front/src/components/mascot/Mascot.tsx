"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";
import { AstronautSvg, type Expression } from "./AstronautSvg";
import { PartRegistry } from "./parts";
import { LEDGE_Y, Rig } from "./rig";
import { SpeechBubble } from "./SpeechBubble";

const INTRO_KEY = "lrh:mascot-intro";
const VIEW_W = 200; // svg units
const OFFSTAGE_Y = 300; // fully below the screen edge

/** Standing in the middle of her box / sitting against the right screen frame. */
const STAND = { x: 92, y: 0, rot: 0, legL: 0, legR: 0, armL: 8, armR: -8, head: 0, laptop: 0 };
const SEATED = { x: 128, y: 36, rot: 9, legL: 88, legR: 94, armL: 22, armR: 52, head: -9, laptop: 1 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Props = {
  /** Visitor is past the hero (the chat is available). */
  active: boolean;
  chatOpen: boolean;
  onOpen: () => void;
};

/**
 * Mini-Laura astronaut that climbs onto the screen, says hi and then sits
 * against the right frame working on her laptop. Clicking her opens the chat.
 *
 * Architecture:
 *  - `Rig` (rig.ts): spring physics per joint + procedural layers.
 *  - render loop: writes SVG transforms directly (no React render per frame).
 *  - script: an async "director" that changes targets, faces and bubbles.
 */
export function Mascot({ active, chatOpen, onOpen }: Props) {
  const t = useTranslations("mascot");
  const { reduced } = useMotionPreference();
  const isMobile = useMediaQuery("(max-width: 767px)");

  const rig = useRef<Rig>(null);
  if (!rig.current) rig.current = new Rig({ ...SEATED, y: OFFSTAGE_Y });

  const [parts] = useState(() => new PartRegistry());

  const [expression, setExpression] = useState<Expression>("focus");
  const [talking, setTalking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [pose, setPose] = useState<"offstage" | "standing" | "seated">("offstage");
  const busy = useRef(false); // director is in the middle of an action
  const hovering = useRef(false);
  const blinkLock = useRef(false);

  // ---------------------------------------------------------------- render loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let nextBlink = performance.now() + 2500;
    let blinkStart = -1;

    const frame = (now: number) => {
      const r = rig.current!;
      r.step((now - last) / 1000);
      last = now;
      const p = r.pose();

      // blink every 2.5–5.5 s (110 ms close/open)
      if (!blinkLock.current && now > nextBlink && blinkStart < 0) blinkStart = now;
      let blink = 0;
      if (blinkStart >= 0) {
        const k = (now - blinkStart) / 130;
        blink = k < 1 ? Math.sin(k * Math.PI) : 0;
        if (k >= 1) {
          blinkStart = -1;
          nextBlink = now + rand(2500, 5500);
        }
      }

      const sx = 1 + (1 - p.squash) * 0.7;
      parts.attr("body", "transform", `translate(${p.x} ${LEDGE_Y + p.y}) rotate(${p.rot}) scale(${sx} ${p.squash})`);
      parts.attr("head", "transform", `rotate(${p.head})`);
      parts.attr("armL", "transform", `rotate(${p.armL}) scale(1 ${p.stretchL})`);
      parts.attr("armR", "transform", `rotate(${p.armR}) scale(1 ${p.stretchR})`);
      parts.attr("legL", "transform", `rotate(${p.legL})`);
      parts.attr("legR", "transform", `rotate(${p.legR})`);
      parts.attr("antenna", "transform", `rotate(${p.antenna})`);
      parts.attr("pupils", "transform", `translate(${p.lookX} ${p.lookY})`);
      parts.attr("lids", "transform", `translate(0 -40.4) scale(1 ${blink}) translate(0 40.4)`);
      const lap = Math.max(0, Math.min(1, p.laptop));
      parts.attr("laptop", "transform", `translate(-26 -60) scale(${lap}) translate(26 60)`);
      parts.attr("laptop", "opacity", String(lap));
      parts.attr("screenGlow", "opacity", String(lap * 0.06));

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [parts]);

  // ---------------------------------------------------------------- talking mouth
  useEffect(() => {
    if (!talking) return;
    const id = setInterval(() => setMouthOpen((o) => !o), 120);
    return () => clearInterval(id);
  }, [talking]);

  // ---------------------------------------------------------------- director
  useEffect(() => {
    const r = rig.current!;
    let alive = true;
    const wait = async (ms: number) => {
      await sleep(ms);
      if (!alive) throw new Error("cancelled");
    };
    const say = async (text: string, hold: number) => {
      setBubble(text);
      setExpression("talk");
      setTalking(true);
      await wait(text.length * 34 + 250);
      setTalking(false);
      setExpression("happy");
      await wait(hold);
      setBubble(null);
    };
    const lookAtViewer = () => r.set({ lookX: 0, lookY: 0 });
    const lookAtLaptop = () => r.set({ lookX: -2.2, lookY: 1.8 });

    const sitWorking = () => {
      r.set(SEATED, 0.9);
      r.layers.typing = true;
      lookAtLaptop();
      setExpression("focus");
      setPose("seated");
    };

    // Leave the stage: drop below the edge (chat open, back to the hero…)
    const leave = async () => {
      r.layers = { climb: false, struggle: 0, kick: false, wave: false, typing: false };
      r.set({ y: OFFSTAGE_Y }, 0.9);
      setBubble(null);
      setTalking(false);
      setPose("offstage");
    };

    // Reduced motion: just be there, seated, still.
    const stayStill = async () => {
      r.layers = { climb: false, struggle: 0, kick: false, wave: false, typing: false };
      r.snap({ ...SEATED, lookX: -2.2, lookY: 1.8 });
      setExpression("focus");
      setPose("seated");
    };

    let introSeen = false;
    try {
      introSeen = sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {
      /* ignore */
    }

    const intro = async () => {
      busy.current = true;
      // ---- 1. hands slap onto the ledge
      r.layers = { climb: true, struggle: 0, kick: false, wave: false, typing: false };
      r.snap({ ...STAND, y: 270, head: 0, lookX: 0, lookY: -1 });
      setExpression("effort");
      setPose("standing");
      r.set({ y: 121 }, 1.6);
      await wait(650);
      // ---- 2. pull up in jerky efforts (struggle + scrambling legs)
      r.layers.struggle = 1;
      r.layers.kick = true;
      r.set({ y: 104 }, 0.55);
      await wait(700);
      r.set({ y: 84, head: -6 }, 0.5);
      await wait(800);
      r.layers.struggle = 0.5;
      r.set({ y: 92 }, 0.8); // slips a bit… 
      await wait(320);
      r.layers.struggle = 1.2;
      r.set({ y: 64, head: 5 }, 0.55);
      await wait(800);
      r.set({ y: 54 }, 0.6);
      // ---- 3. knee onto the ledge
      r.layers.kick = false;
      r.set({ legR: -100, legL: 20 }, 0.9);
      await wait(550);
      // ---- 4. hop up, land with a squash
      r.layers.struggle = 0;
      r.layers.climb = false;
      r.set({ y: -22, legR: 0, legL: 0, armL: 40, armR: -40, head: 0 }, 1.3);
      await wait(330);
      r.set({ y: 0, armL: 8, armR: -8 }, 1.2);
      await wait(220);
      r.kickJoint("squash", -2.2);
      r.kickJoint("antenna", 120);
      // ---- 5. phew
      setExpression("relief");
      await wait(500);
      setBubble(t("phew"));
      r.set({ squash: 0.97 }, 0.6);
      await wait(900);
      setBubble(null);
      r.set({ squash: 1 });
      // ---- 6. look at the visitor and wave
      lookAtViewer();
      r.set({ head: 6 });
      r.set({ armR: -150 }, 1.2);
      r.layers.wave = true;
      await say(t("hello"), 1800);
      r.layers.wave = false;
      r.set({ armR: -8, head: 0 });
      await wait(350);
      // ---- 7. hop over to the right frame
      r.set({ lookX: 2.5, lookY: 0 });
      for (let i = 0; i < 3; i++) {
        r.set({ x: STAND.x + ((SEATED.x - STAND.x) * (i + 1)) / 3, y: -9, rot: 6 }, 1.1);
        await wait(190);
        r.set({ y: 0, rot: 0 }, 1.2);
        await wait(170);
        r.kickJoint("squash", -0.9);
      }
      // ---- 8. lean against the frame, sit, open the laptop
      r.set({ rot: 12 }, 0.8);
      await wait(250);
      sitWorking();
      r.layers.typing = false;
      await wait(900);
      r.layers.typing = true;
      await wait(1200);
      // ---- 9. "if you need me, I'm here"
      r.layers.typing = false;
      r.set({ head: 4 });
      lookAtViewer();
      await say(t("here"), 2600);
      sitWorking();
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {
        /* ignore */
      }
      busy.current = false;
    };

    const comeBack = async () => {
      busy.current = true;
      r.layers = { climb: false, struggle: 0, kick: false, wave: false, typing: false };
      r.snap({ ...SEATED, y: Math.max(r.value.y, 160) });
      sitWorking();
      r.layers.typing = false;
      r.set({ y: SEATED.y }, 0.9);
      await wait(700);
      r.kickJoint("antenna", 90);
      sitWorking();
      busy.current = false;
    };

    // Small random actions while seated, so she never looks frozen.
    const idle = async () => {
      for (;;) {
        await wait(rand(5000, 9000));
        if (busy.current || hovering.current) continue;
        busy.current = true;
        const action = Math.random();
        if (action < 0.45) {
          // glance at the visitor and smile
          r.layers.typing = false;
          lookAtViewer();
          r.set({ head: 3 });
          setExpression("happy");
          await wait(1600);
        } else if (action < 0.7) {
          // stretch
          r.layers.typing = false;
          setExpression("relief");
          r.set({ armL: 150, armR: -150, head: 0, rot: 14 }, 0.7);
          await wait(1300);
          r.kickJoint("antenna", 80);
        } else {
          // "hmm" — think, then type faster
          r.layers.typing = false;
          setExpression("curious");
          r.set({ lookX: 2.5, lookY: -2.5, head: 8 });
          await wait(1400);
          r.kickJoint("antenna", 60);
        }
        sitWorking();
        busy.current = false;
      }
    };

    (async () => {
      try {
        if (!active || chatOpen) return await leave();
        if (reduced) return await stayStill();
        if (introSeen) await comeBack();
        else await intro();
        await idle();
      } catch {
        /* cancelled */
      }
    })();

    return () => {
      alive = false;
      busy.current = false;
    };
  }, [active, chatOpen, reduced, t]);

  // ---------------------------------------------------------------- hover
  const onEnter = useCallback(() => {
    hovering.current = true;
    if (busy.current || pose !== "seated") return;
    const r = rig.current!;
    r.layers.typing = false;
    r.set({ lookX: 0, lookY: 0, head: 5, armR: -120 });
    r.layers.wave = !reduced;
    blinkLock.current = false;
    setExpression("talk");
    setTalking(!reduced);
    setBubble(t("hover"));
    setTimeout(() => setTalking(false), 700);
  }, [pose, reduced, t]);

  const onLeave = useCallback(() => {
    hovering.current = false;
    if (busy.current || pose !== "seated") return;
    const r = rig.current!;
    r.layers.wave = false;
    r.set({ ...SEATED, lookX: -2.2, lookY: 1.8 }, 0.9);
    r.layers.typing = !reduced;
    setExpression("focus");
    setTalking(false);
    setBubble(null);
  }, [pose, reduced]);

  // ---------------------------------------------------------------- layout
  const widthPx = isMobile ? 132 : 210;
  const s = widthPx / VIEW_W;
  const bubbleStyle: React.CSSProperties =
    pose === "seated"
      ? { right: (VIEW_W - 108) * s, bottom: 158 * s }
      : { right: (VIEW_W - 62) * s, bottom: 196 * s };

  return (
    <div
      className={cn("fixed bottom-0 right-0 z-[55] select-none", pose === "offstage" && "pointer-events-none")}
      style={{ width: widthPx, height: 250 * s }}
    >
      <SpeechBubble text={bubble} style={bubbleStyle} />
      {/* the "ledge" she climbs: a faint glowing edge of the screen */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#a78bfa,#22d3ee)] transition-opacity duration-700",
          pose === "offstage" ? "opacity-0" : "opacity-70",
        )}
      />
      <button
        type="button"
        onClick={onOpen}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        aria-label={t("label")}
        aria-expanded={chatOpen}
        tabIndex={pose === "offstage" ? -1 : 0}
        className="absolute inset-0 cursor-pointer rounded-t-3xl focus-visible:outline-offset-[-4px]"
      >
        <svg viewBox={`0 0 ${VIEW_W} ${LEDGE_Y}`} className="h-full w-full overflow-visible" aria-hidden>
          <AstronautSvg bind={parts.bind} expression={expression} mouthOpen={talking && mouthOpen} />
        </svg>
      </button>
    </div>
  );
}
