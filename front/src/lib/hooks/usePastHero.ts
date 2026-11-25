"use client";

import { useEffect, useState } from "react";

/**
 * True once the visitor has "entered the star" (the #core section reached
 * the top of the viewport), or on pages that have no hero. Used to reveal the navbar and the chat launcher.
 */
export function usePastHero(offset = 120) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const check = () => {
      const core = document.getElementById("core");
      // Pages without the hero (blog) count as already past it.
      if (!core) return setPast(true);
      setPast(core.getBoundingClientRect().top <= offset);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [offset]);

  return past;
}
