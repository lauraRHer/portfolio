"use client";

import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { usePastHero } from "@/lib/hooks/usePastHero";
import { checkHealth } from "@/lib/chat/api";
import { useWebGLSupport } from "@/lib/hooks/useWebGLSupport";
import { ChatPanel } from "./ChatPanel";

const Mascot3D = dynamic(() => import("@/components/mascot3d/Mascot3D"), { ssr: false });

/**
 * Assistant entry point.
 * The launcher is the mini-Laura astronaut: 3D (React Three Fiber) when WebGL
 * is available, 2D SVG fallback otherwise. Clicking her opens the panel.
 */
export function ChatWidget() {
  const pastHero = usePastHero();
  const webgl = useWebGLSupport();
  const [open, setOpen] = useState(false);
  const MascotImpl = webgl ? Mascot3D : Mascot;

  // Wake the API on page load: a free host that sleeps when idle takes about a
  // minute to start, better spent while the visitor scrolls than after a question.
  useEffect(() => {
    void checkHealth();
  }, []);

  return (
    <>
      <AnimatePresence>{open && <ChatPanel onClose={() => setOpen(false)} />}</AnimatePresence>
      {webgl !== null && <MascotImpl active={pastHero} chatOpen={open} onOpen={() => setOpen(true)} />}
    </>
  );
}
