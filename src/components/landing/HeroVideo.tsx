"use client";

/**
 * Hero video — native HTML5 only.
 * Performance: loads when visible; progressive preload; pauses off-screen.
 * Fallback: static coastal gradient when reduced motion, save-data, or slow network.
 */

import { useEffect, useRef, useState } from "react";

const VIDEOS = [
  { src: "https://assets.mixkit.co/videos/1573/1573-720.mp4", seconds: 18 },
  { src: "https://assets.mixkit.co/videos/42495/42495-720.mp4", seconds: 8 },
  { src: "https://assets.mixkit.co/videos/2178/2178-720.mp4", seconds: 4 },
] as const;

const videoStyle = {
  width: "max(100vw, 177.78vh)",
  height: "max(100vh, 56.25vw)",
  minWidth: "100vw",
  minHeight: "100vh",
} as const;

function useStaticHeroFallback(): boolean {
  const [staticOnly, setStaticOnly] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      let saveData = false;
      let slow = false;
      try {
        const conn = (
          navigator as Navigator & {
            connection?: { saveData?: boolean; effectiveType?: string };
          }
        ).connection;
        saveData = !!conn?.saveData;
        const et = conn?.effectiveType;
        slow = et === "slow-2g" || et === "2g";
      } catch {
        /* ignore */
      }
      setStaticOnly(reduce.matches || saveData || slow);
    };
    update();
    reduce.addEventListener("change", update);
    try {
      (
        navigator as Navigator & {
          connection?: EventTarget;
        }
      ).connection?.addEventListener?.("change", update);
    } catch {
      /* ignore */
    }
    return () => {
      reduce.removeEventListener("change", update);
      try {
        (
          navigator as Navigator & {
            connection?: EventTarget;
          }
        ).connection?.removeEventListener?.("change", update);
      } catch {
        /* ignore */
      }
    };
  }, []);

  return staticOnly;
}

function StaticHeroPoster() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-sky-950/80 to-indigo-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(56,189,248,0.12),transparent_55%)] opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_70%_80%,rgba(99,102,241,0.15),transparent_50%)] opacity-30" />
    </div>
  );
}

function StaticHeroPosterLight() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-slate-100" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(56,189,248,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(99,102,241,0.08),transparent_50%)]" />
    </div>
  );
}

export function HeroVideo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const staticOnly = useStaticHeroFallback();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set());
  const hasBeenVisible = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    if (staticOnly) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        if (visible && !hasBeenVisible.current) {
          hasBeenVisible.current = true;
          setLoadedIndices((prev) => new Set([...prev, 0]));
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [staticOnly]);

  useEffect(() => {
    if (staticOnly) return;
    if (!loadedIndices.has(activeIndex)) return;
    const next = (activeIndex + 1) % VIDEOS.length;
    if (loadedIndices.has(next)) return;
    setLoadedIndices((prev) => new Set([...prev, next]));
  }, [activeIndex, loadedIndices, staticOnly]);

  useEffect(() => {
    if (staticOnly || !isVisible) return;
    const { seconds } = VIDEOS[activeIndex];
    const id = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % VIDEOS.length);
    }, seconds * 1000);
    return () => clearTimeout(id);
  }, [activeIndex, isVisible, staticOnly]);

  useEffect(() => {
    if (staticOnly) return;
    refs.current.forEach((el, i) => {
      if (!el) return;
      if (!isVisible) {
        el.pause();
        return;
      }
      if (i === activeIndex) {
        try {
          if (el.readyState >= 1) el.currentTime = 0;
        } catch {
          /* ignore */
        }
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [activeIndex, isVisible, staticOnly]);

  if (staticOnly) {
    return tone === "light" ? <StaticHeroPosterLight /> : <StaticHeroPoster />;
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className={
          tone === "light"
            ? "absolute inset-0 bg-gradient-to-b from-white/92 via-slate-50/88 to-slate-100/90 transition-opacity duration-500"
            : "absolute inset-0 bg-gradient-to-b from-slate-900/95 to-slate-950 transition-opacity duration-500"
        }
        style={{ opacity: isVisible ? 0 : 1 }}
        aria-hidden
      />
      {VIDEOS.map(({ src }, i) =>
        loadedIndices.has(i) ? (
          <video
            key={src}
            ref={(el) => {
              refs.current[i] = el;
            }}
            autoPlay={i === 0 && isVisible}
            muted
            loop
            playsInline
            preload={
              i === activeIndex
                ? "auto"
                : i === (activeIndex + 1) % VIDEOS.length
                  ? "metadata"
                  : "none"
            }
            className="absolute left-1/2 top-1/2 h-auto w-auto -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-1000"
            style={{
              ...videoStyle,
              opacity: i === activeIndex && isVisible ? 1 : 0,
              pointerEvents: i === activeIndex ? "auto" : "none",
            }}
          >
            <source src={src} type="video/mp4" />
          </video>
        ) : null
      )}
    </div>
  );
}
