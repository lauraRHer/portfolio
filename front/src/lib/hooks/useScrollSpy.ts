"use client";

import { useEffect, useState } from "react";

/**
 * Returns the id of the section currently crossing the middle of the viewport.
 * Uses IntersectionObserver (no scroll listeners, no focus stealing).
 */
export function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      // A thin band in the middle of the viewport decides the active section.
      { rootMargin: "-45% 0px -55% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
