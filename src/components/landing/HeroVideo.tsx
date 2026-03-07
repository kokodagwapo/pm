"use client";

/**
 * Hero video background - Native HTML5 video only (no YouTube)
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
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  // Advance to next video (wrap back to 0 after the last)
  useEffect(() => {
    const { seconds } = VIDEOS[activeIndex];
    const id = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % VIDEOS.length);
    }, seconds * 1000);
    return () => clearTimeout(id);
  }, [activeIndex]);

  // Play active video from start, pause others
  useEffect(() => {
    refs.current.forEach((el, i) => {
      if (!el) return;
      if (i === activeIndex) {
        try {
          if (el.readyState >= 1) el.currentTime = 0;
        } catch {
          /* ignore */
        }
        el.play().catch(() => { });
      } else {
        el.pause();
      }
    });
  }, [activeIndex]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {VIDEOS.map(({ src }, i) => (
        <video
          key={src}
          ref={(el) => {
            refs.current[i] = el;
          }}
          autoPlay={i === 0}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute left-1/2 top-1/2 w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-1000"
          style={{
            ...videoStyle,
            opacity: i === activeIndex ? 1 : 0,
            pointerEvents: i === activeIndex ? "auto" : "none",
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
      ))}
    </div>
  );
}
