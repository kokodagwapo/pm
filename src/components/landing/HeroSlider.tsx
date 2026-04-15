"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1920&q=85&auto=format&fit=crop",
    label: "Family Living",
    alt: "Happy family with their golden retriever relaxing in a bright modern home",
    kb: "kb-right",
  },
  {
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=85&auto=format&fit=crop",
    label: "Beautiful Homes",
    alt: "Sunlit modern apartment interior with open floor plan",
    kb: "kb-left",
  },
  {
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=85&auto=format&fit=crop",
    label: "Luxury Villas",
    alt: "Stunning luxury villa with pool and manicured garden",
    kb: "kb-up",
  },
  {
    url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1920&q=85&auto=format&fit=crop",
    label: "Professional Cleaners",
    alt: "Happy professional cleaner smiling in a spotless home",
    kb: "kb-right",
  },
  {
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&q=85&auto=format&fit=crop",
    label: "Expert Handymen",
    alt: "Skilled handyman performing professional home maintenance",
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
