"use client";

/**
 * Hero video background - Native HTML5 video only (no YouTube)
 * Optimized: loads only when visible, progressive preload, single active video.
 * Cycles: video 1 (18s) → video 2 (8s) → video 3 (4s) → back to video 1
 * Sources: Mixkit free stock (aerial tropical beaches)
 */

import { useEffect, useRef, useState } from "react";

const VIDEOS = [
  { src: "https://assets.mixkit.co/videos/1573/1573-720.mp4", seconds: 18 },
  { src: "https://assets.mixkit.co/videos/42495/42495-720.mp4", seconds: 8 },
  { src: "https://assets.mixkit.co/videos/2178/2178-720.mp4", seconds: 4 },
];

const videoStyle = {
  width: "max(100vw, 177.78vh)",
  height: "max(100vh, 56.25vw)",
  minWidth: "100vw",
  minHeight: "100vh",
};

export function HeroVideo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set());
  const hasBeenVisible = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  // Only load and play when in view (saves bandwidth when tab is backgrounded)
  useEffect(() => {
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
  }, []);

  // Preload next video when we have the current one (progressive: 0 → 1 → 2)
  useEffect(() => {
    if (!loadedIndices.has(activeIndex)) return;
    const next = (activeIndex + 1) % VIDEOS.length;
    if (loadedIndices.has(next)) return;
    setLoadedIndices((prev) => new Set([...prev, next]));
  }, [activeIndex, loadedIndices]);

  // Advance to next video (wrap back to 0 after the last)
  useEffect(() => {
    if (!isVisible) return;
    const { seconds } = VIDEOS[activeIndex];
    const id = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % VIDEOS.length);
    }, seconds * 1000);
    return () => clearTimeout(id);
  }, [activeIndex, isVisible]);

  // Play active video when visible, pause when not; manage preload
  useEffect(() => {
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
  }, [activeIndex, isVisible]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Gradient poster while loading or when not visible — avoids layout shift */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-slate-900/95 to-slate-950 transition-opacity duration-500"
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
            preload={i === activeIndex ? "auto" : i === (activeIndex + 1) % VIDEOS.length ? "metadata" : "none"}
            className="absolute left-1/2 top-1/2 w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-1000"
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
