"use client";

/**
 * Hero video background - Native HTML5 video only (no YouTube)
 * Reliable muted autoplay, smooth cycling between aerial beach clips
 * Sources: Mixkit free stock (aerial tropical beaches)
 */

import { useEffect, useRef, useState } from "react";

const VIDEOS = [
  "https://assets.mixkit.co/videos/1573/1573-720.mp4", // Aerial tropical beach with green palms, white sand
  "https://assets.mixkit.co/videos/42495/42495-720.mp4", // Flying over peaceful sunny beach - turquoise sea, white sand
  "https://assets.mixkit.co/videos/2178/2178-720.mp4", // White sand paradise beach - palm trees, blue ocean
];

const CYCLE_SECONDS = 18;

const videoStyle = {
  width: "max(100vw, 177.78vh)",
  height: "max(100vh, 56.25vw)",
  minWidth: "100vw",
  minHeight: "100vh",
};

export function HeroVideo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  // Cycle videos on a timer
  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % VIDEOS.length);
    }, CYCLE_SECONDS * 1000);
    return () => clearInterval(id);
  }, []);

  // Play active video, pause others, reset position when switching
  useEffect(() => {
    refs.current.forEach((el, i) => {
      if (!el) return;
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
  }, [activeIndex]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {VIDEOS.map((src, i) => (
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
