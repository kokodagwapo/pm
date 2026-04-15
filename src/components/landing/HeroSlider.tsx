"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1609220136736-443140cfeaa8?w=1920&q=85&auto=format&fit=crop",
    label: "Families",
    alt: "Happy family together in their beautiful rental home",
  },
  {
    url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=85&auto=format&fit=crop",
    label: "Friends",
    alt: "Friends relaxing and laughing in a vacation rental",
  },
  {
    url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=85&auto=format&fit=crop",
    label: "Property Managers",
    alt: "Professional property manager presenting a home",
  },
  {
    url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1920&q=85&auto=format&fit=crop",
    label: "Pet-Friendly Stays",
    alt: "Happy golden retriever in a cozy pet-friendly home",
  },
  {
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=85&auto=format&fit=crop",
    label: "Expert Maintenance",
    alt: "Skilled handyman performing professional home maintenance",
  },
  {
    url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1920&q=85&auto=format&fit=crop",
    label: "Beautiful Properties",
    alt: "Stunning rental property exterior at golden hour",
  },
] as const;

const SLIDE_DURATION = 5000;

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(new Set([0]));
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((index: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setLoaded((prev) => {
        const next = new Set(prev);
        next.add(index);
        next.add((index + 1) % SLIDES.length);
        return next;
      });
      setTransitioning(false);
    }, 600);
  }, []);

  const advance = useCallback(() => {
    setCurrent((prev) => {
      const next = (prev + 1) % SLIDES.length;
      setLoaded((l) => {
        const n = new Set(l);
        n.add(next);
        n.add((next + 1) % SLIDES.length);
        return n;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(advance, SLIDE_DURATION);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [advance]);

  const handleDotClick = (i: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    goTo(i);
    timerRef.current = setInterval(advance, SLIDE_DURATION);
  };

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {SLIDES.map(({ url, alt }, i) =>
        loaded.has(i) ? (
          <img
            key={url}
            src={url}
            alt={alt}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out"
            style={{ opacity: i === current && !transitioning ? 1 : 0 }}
          />
        ) : null
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.22) 40%, rgba(0,0,0,0.65) 100%)",
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
  );
}
