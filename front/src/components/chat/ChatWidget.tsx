"use client";

import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { usePastHero } from "@/lib/hooks/usePastHero";
import { checkHealth } from "@/lib/chat/api";
import { useWebGLSupport } from "@/lib/hooks/useWebGLSupport";
import { OPEN_ASSISTANT_EVENT, type OpenAssistantDetail } from "@/lib/chat/events";
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
  const [prefill, setPrefill] = useState<string | undefined>();
  const MascotImpl = webgl ? Mascot3D : Mascot;

  // Wake the API on page load: a free host that sleeps when idle takes about a
  // minute to start, better spent while the visitor scrolls than after a question.
  useEffect(() => {
    void checkHealth();
  }, []);

  // Other components (e.g. "Ask the assistant" in a blog post) can open the chat.
  useEffect(() => {
    const onOpen = (e: Event) => {
      setPrefill((e as CustomEvent<OpenAssistantDetail>).detail?.question);
      setOpen(true);
    };
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
  }, []);

  return (
    <>
      <AnimatePresence>{open && <ChatPanel initialInput={prefill} onClose={() => { setOpen(false); setPrefill(undefined); }} />}</AnimatePresence>
      {webgl !== null && <MascotImpl active={pastHero} chatOpen={open} onOpen={() => setOpen(true)} />}
    </>
  );
}
