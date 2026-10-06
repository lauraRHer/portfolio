"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { SpeechBubble } from "@/components/mascot/SpeechBubble";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/providers/MotionPreferenceProvider";
import { createLayers, createRig } from "./rigState";

// three.js scene in its own lazy chunk
const Stage = dynamic(() => import("./Stage"), { ssr: false });

const INTRO_KEY = "lrh:mascot-intro";
const OFFSTAGE = -1.45;

/** Key poses (rig targets). Units: world units / radians. */
const POSES = {
  stand: {
    rootX: -0.2, rootY: 0, rootRy: 0, hipsRz: 0, spineRx: 0, spineRz: 0,
    shLz: -0.15, shLx: 0, elLz: 0.12, elLx: 0, shRz: 0.15, shRx: 0, elRz: -0.12, elRx: 0,
    hipLx: 0, hipLz: 0, kneeLx: 0, hipRx: 0, hipRz: 0, kneeRx: 0,
    headRx: 0, headRy: 0, headRz: 0, laptop: 0,
  },
  // rootY puts her seat on the screen edge with the thighs horizontal (AstronautGLB proportions)
  seated: {
    rootX: 0.36, rootY: -0.28, rootRy: -0.62, hipsRz: 0.1, spineRx: -0.06, spineRz: 0,
    shLz: -0.08, shLx: -1.05, elLz: 0.1, elLx: -0.35, shRz: 0.08, shRx: -1.05, elRz: -0.1, elRx: -0.35,
    hipLx: -1.5, hipLz: 0.05, kneeLx: 1.45, hipRx: -1.5, hipRz: -0.05, kneeRx: 1.4,
    headRx: 0.3, headRy: 0.05, headRz: 0.04, laptop: 1,
  },
} as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Props = { active: boolean; chatOpen: boolean; onOpen: () => void };

/**
 * 3D mini-Laura astronaut (chat launcher). Same behaviour as the 2D mascot
 * (components/mascot) but rendered with React Three Fiber.
 * The "director" below is an async script that only changes spring targets,
 * procedural layers and bubbles; the Stage animates everything per frame.
 */
export default function Mascot3D({ active, chatOpen, onOpen }: Props) {
  const t = useTranslations("mascot");
  const { reduced } = useMotionPreference();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [rig] = useState(createRig);
  const [layers] = useState(createLayers);
  const [bubble, setBubble] = useState<string | null>(null);
  const [pose, setPose] = useState<"offstage" | "standing" | "seated">("offstage");
  const [ctl] = useState(() => ({ busy: false, hovering: false }));

  // ---------------------------------------------------------------- director
  useEffect(() => {
    let alive = true;
    const wait = async (ms: number) => {
      await sleep(ms);
      if (!alive) throw new Error("cancelled");
    };
    const resetLayers = () => Object.assign(layers, createLayers());
    const say = async (text: string, hold: number) => {
      setBubble(text);
      layers.talk = true;
      await wait(text.length * 34 + 300);
      layers.talk = false;
      await wait(hold);
      setBubble(null);
    };
    const lookAtLaptop = () => rig.set({ headRx: 0.3, headRy: 0.05 });
    const lookAtViewer = (seated: boolean) => rig.set({ headRx: 0, headRy: seated ? 0.55 : 0 });
    const sitWorking = () => {
      rig.set(POSES.seated, 0.85);
      layers.typing = true;
      lookAtLaptop();
      setPose("seated");
    };

    const leave = async () => {
      resetLayers();
      rig.set({ rootY: OFFSTAGE }, 0.8);
      setBubble(null);
      setPose("offstage");
    };

    const stayStill = async () => {
      resetLayers();
      rig.snap(POSES.seated);
      setPose("seated");
    };

    const intro = async () => {
      ctl.busy = true;
      resetLayers();
      // ---- 1. gloves slap onto the screen edge, top of her head peeks out
      rig.snap({ ...POSES.stand, rootY: -1.25 });
      layers.climb = true;
      setPose("standing");
      rig.set({ rootY: -0.8 }, 1.5);
      await wait(700);
      // ---- 2. pulls, slips, pulls again (trembling, scrambling legs)
      layers.struggle = 1;
      layers.kick = true;
      rig.set({ rootY: -0.66, headRz: 0.08 }, 0.5);
      await wait(800);
      rig.set({ rootY: -0.5, headRz: -0.06, headRx: -0.1 }, 0.45);
      await wait(850);
      layers.struggle = 0.5;
      rig.set({ rootY: -0.56 }, 0.9); // slips…
      await wait(260);
      layers.struggle = 1.3;
      rig.set({ rootY: -0.38, headRz: 0.05 }, 0.5);
      await wait(850);
      rig.set({ rootY: -0.3 }, 0.6);
      // ---- 3. right leg up onto the ledge
      layers.kick = false;
      rig.set({ hipRz: 1.75, kneeRx: 0, hipRx: -0.4, hipLx: 0.2 }, 0.9);
      await wait(600);
      // ---- 4. hop up and land with a squash
      layers.struggle = 0;
      layers.climb = false;
      rig.set({ rootY: 0.13, hipRz: 0, hipRx: 0, hipLx: 0, shLz: -0.9, shRz: 0.9, elLz: 0.4, elRz: -0.4, headRz: 0, headRx: 0 }, 1.3);
      await wait(330);
      rig.set({ rootY: 0, shLz: -0.15, shRz: 0.15, elLz: 0.12, elRz: -0.12 }, 1.2);
      await wait(200);
      rig.impulse("squash", -2.4);
      rig.impulse("sway", 9);
      // ---- 5. phew: wipes her forehead
      await wait(350);
      setBubble(t("phew"));
      rig.set({ shRz: 2.5, elRz: 1.6, headRz: -0.1 }, 1);
      await wait(450);
      rig.set({ shRz: 2.1, elRz: 1.9 }, 1.4);
      await wait(400);
      setBubble(null);
      rig.set({ shRz: 0.15, elRz: -0.12, headRz: 0 });
      // ---- 6. looks at you and waves
      lookAtViewer(false);
      rig.set({ headRz: 0.1, shRz: 2.55, elRz: 0.25 }, 1.2);
      layers.wave = true;
      await say(t("hello"), 1700);
      layers.wave = false;
      rig.set({ shRz: 0.15, elRz: -0.12, headRz: 0 });
      await wait(300);
      // ---- 7. turns and hops over to the right frame
      rig.set({ rootRy: 0.55 });
      await wait(250);
      const x0 = POSES.stand.rootX;
      for (let i = 1; i <= 3; i++) {
        rig.set({ rootX: x0 + ((POSES.seated.rootX - x0) * i) / 3, rootY: 0.07, shLz: -0.5, shRz: 0.5 }, 1.1);
        await wait(200);
        rig.set({ rootY: 0, shLz: -0.15, shRz: 0.15 }, 1.2);
        await wait(170);
        rig.impulse("squash", -1);
      }
      // ---- 8. turns her back to the frame, sits down, opens the laptop
      rig.set({ rootRy: POSES.seated.rootRy }, 0.9);
      await wait(250);
      sitWorking();
      layers.typing = false;
      await wait(900);
      layers.typing = true;
      await wait(1300);
      // ---- 9. "if you need me, I'm here"
      layers.typing = false;
      lookAtViewer(true);
      await say(t("here"), 2600);
      sitWorking();
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {
        /* ignore */
      }
      ctl.busy = false;
    };

    const comeBack = async () => {
      ctl.busy = true;
      resetLayers();
      rig.snap({ ...POSES.seated, rootY: Math.min(rig.get("rootY"), -0.9) });
      sitWorking();
      layers.typing = false;
      rig.set({ rootY: POSES.seated.rootY }, 0.9);
      await wait(700);
      rig.impulse("sway", 7);
      sitWorking();
      ctl.busy = false;
    };

    const idle = async () => {
      for (;;) {
        await wait(rand(5000, 9000));
        if (ctl.busy || ctl.hovering) continue;
        ctl.busy = true;
        layers.typing = false;
        const a = Math.random();
        if (a < 0.45) {
          lookAtViewer(true);
          await wait(1700);
        } else if (a < 0.7) {
          rig.set({ shLz: -2.6, shRz: 2.6, shLx: 0, shRx: 0, elLz: -0.5, elRz: 0.5, spineRx: -0.15, headRx: -0.15 }, 0.7);
          await wait(1400);
          rig.impulse("sway", 6);
        } else {
          rig.set({ headRx: -0.15, headRz: 0.12 });
          await wait(1500);
          rig.impulse("sway", 5);
        }
        sitWorking();
        ctl.busy = false;
      }
    };

    let introSeen = false;
    try {
      introSeen = sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {
      /* ignore */
    }

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
      ctl.busy = false;
    };
  }, [active, chatOpen, reduced, rig, layers, ctl, t]);

  // ---------------------------------------------------------------- hover
  const onEnter = useCallback(() => {
    ctl.hovering = true;
    if (ctl.busy || pose !== "seated") return;
    layers.typing = false;
    rig.set({ headRx: 0, headRy: 0.55, shRx: 0, shRz: 2.4, elRx: 0, elRz: 0.3 });
    layers.wave = !reduced;
    layers.talk = !reduced;
    setBubble(t("hover"));
    setTimeout(() => (layers.talk = false), 900);
  }, [ctl, pose, layers, rig, reduced, t]);

  const onLeave = useCallback(() => {
    ctl.hovering = false;
    if (ctl.busy || pose !== "seated") return;
    layers.wave = false;
    layers.talk = false;
    rig.set(POSES.seated, 0.85);
    layers.typing = !reduced;
    setBubble(null);
  }, [ctl, pose, layers, rig, reduced]);

  // ---------------------------------------------------------------- layout
  const widthPx = isMobile ? 190 : 290;
  const heightPx = isMobile ? 190 : 280;
  const zoom = isMobile ? 112 : 168;
  const toPx = (x: number) => widthPx / 2 + x * zoom; // world x → px from the left
  const bubbleStyle: React.CSSProperties =
    pose === "seated"
      ? { right: widthPx - toPx(POSES.seated.rootX) + 0.12 * zoom, bottom: 0.95 * zoom }
      : { right: widthPx - toPx(POSES.stand.rootX) + 0.2 * zoom, bottom: 1.2 * zoom };

  return (
    <div className={cn("fixed bottom-0 right-0 z-[55] select-none", pose === "offstage" && "pointer-events-none")} style={{ width: widthPx, height: heightPx }}>
      <SpeechBubble text={bubble} style={bubbleStyle} />
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
        className="absolute bottom-0 right-0 h-[85%] w-[70%] cursor-pointer rounded-t-3xl focus-visible:outline-offset-[-4px]"
      />
      <div className="pointer-events-none absolute inset-0">
        <Stage rig={rig} layers={layers} widthPx={widthPx} heightPx={heightPx} zoom={zoom} running={active || pose !== "offstage"} />
      </div>
    </div>
  );
}
