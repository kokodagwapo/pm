"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1920&q=85&auto=format&fit=crop",
    label: "Move-In Ready",
    alt: "Happy family excitedly moving into their beautiful new rest house",
    kb: "kb-right",
  },
  {
    url: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=1920&q=85&auto=format&fit=crop",
    label: "Happy Residents",
    alt: "Young happy couple cuddling with their cute dog in their cozy apartment",
    kb: "kb-left",
  },
  {
    url: "https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=1920&q=85&auto=format&fit=crop",
    label: "Community Life",
    alt: "Happy family playing with their children at a sunny community playground",
    kb: "kb-up",
  },
  {
    url: "https://images.unsplash.com/photo-1527515637462-cff94ebb786e?w=1920&q=85&auto=format&fit=crop",
    label: "Expert Cleaners",
    alt: "Happy team of professional lady cleaners smiling together in a bright home",
    kb: "kb-right",
  },
  {
    url: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=1920&q=85&auto=format&fit=crop",
    label: "Trusted Maintenance",
    alt: "Friendly handyman servicing a garage AC unit with a confident smile",
    kb: "kb-left",
  },
  {
    url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1920&q=85&auto=format&fit=crop",
    label: "Pet-Friendly Homes",
    alt: "Adorable golden retriever happily sitting inside a cozy rental home",
    kb: "kb-up",
  },
] as const;

const KB_CSS = `
  @keyframes kb-right {
    from { transform: scale(1.00) translate(0%, 0%); }
    to   { transform: scale(1.10) translate(-1.5%, -0.5%); }
  }
  @keyframes kb-left {
    from { transform: scale(1.00) translate(0%, 0%); }
    to   { transform: scale(1.10) translate(1.5%, 0.5%); }
  }
  @keyframes kb-up {
    from { transform: scale(1.00) translate(0%, 0%); }
    to   { transform: scale(1.10) translate(0.4%, -1.5%); }
  }
  .kb-right { animation: kb-right 14s ease-in-out forwards; }
  .kb-left  { animation: kb-left  14s ease-in-out forwards; }
  .kb-up    { animation: kb-up    14s ease-in-out forwards; }
`;

const SLIDE_DURATION = 6000;

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(new Set([0, 1]));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const preload = useCallback((index: number) => {
    setLoaded((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const advance = useCallback(() => {
    setCurrent((prev) => {
      const next = (prev + 1) % SLIDES.length;
      preload((next + 1) % SLIDES.length);
      return next;
    });
    setEpoch((e) => e + 1);
  }, [preload]);

  useEffect(() => {
    timerRef.current = setInterval(advance, SLIDE_DURATION);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance]);

  const handleDotClick = useCallback((i: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    preload((i + 1) % SLIDES.length);
    setCurrent(i);
    setEpoch((e) => e + 1);
    timerRef.current = setInterval(advance, SLIDE_DURATION);
  }, [advance, preload]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KB_CSS }} />

      <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {SLIDES.map(({ url, alt, kb }, i) =>
          loaded.has(i) ? (
            <div
              key={i === current ? `${i}-${epoch}` : i}
              className="absolute inset-0"
              style={{
                opacity: i === current ? 1 : 0,
                transition: "opacity 1400ms ease-in-out",
                willChange: "opacity",
              }}
            >
              <img
                src={url}
                alt={alt}
                draggable={false}
                className={`absolute inset-0 h-full w-full object-cover ${i === current ? kb : ""}`}
                style={{ willChange: "transform" }}
              />
            </div>
          ) : null
        )}

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.62) 100%)",
          }}
        />

        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {SLIDES.map((slide, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide: ${slide.label}`}
              onClick={() => handleDotClick(i)}
              className="group flex items-center gap-1.5 focus:outline-none"
            >
              <span
                className={`block h-1 rounded-full transition-all duration-500 ${
                  i === current
                    ? "w-8 bg-white"
                    : "w-2 bg-white/45 group-hover:bg-white/70"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-[11px] font-medium tracking-wide text-white/70">
            {SLIDES[current].label}
          </span>
        </div>
      </div>
    </>
  );
}
