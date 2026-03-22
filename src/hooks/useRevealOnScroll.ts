"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Adds `data-revealed="true"` when the element intersects the viewport.
 * Respects prefers-reduced-motion (reveals immediately).
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== "undefined") {
      try {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setRevealed(true);
          return;
        }
      } catch {
        /* ignore */
      }
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, revealed };
}
