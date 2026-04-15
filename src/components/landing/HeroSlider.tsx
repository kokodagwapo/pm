"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1543342384-1f1350e27861?w=1920&q=85&auto=format&fit=crop",
    label: "New Beginnings",
    alt: "Loving couple tenderly holding their newborn baby — a new family at home",
    kb: "kb-right",
  },
  {
    url: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=1920&q=85&auto=format&fit=crop",
    label: "Happy Residents",
    alt: "Young happy couple cuddling with their cute dog in their cozy apartment",
    kb: "kb-left",
  },
  {
    url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1920&q=85&auto=format&fit=crop",
    label: "Morning Coffee",
    alt: "Beautiful woman in her apartment kitchen having coffee in the morning",
    kb: "kb-up",
  },
  {
    url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1920&q=85&auto=format&fit=crop",
    label: "Expert Cleaning",
    alt: "Pretty woman cleaning her living room with a vacuum",
    kb: "kb-right",
  },
  {
    url: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=1920&q=85&auto=format&fit=crop",
    label: "Trusted Maintenance",
    alt: "Friendly handyman servicing a garage AC unit with a confident smile",
    kb: "kb-left",
  },
  {
    url: "https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?w=1920&q=85&auto=format&fit=crop",
    label: "Family Living",
    alt: "Happy family — mother, father and two young kids — laughing together while petting their golden retriever at home",
    kb: "kb-up",
  },
] as const;

const KB_CSS = `
  @keyframes kb-right {
    from { transform: scale(1.02) translate(0%,    0%);    }
    to   { transform: scale(1.06) translate(-0.9%, -0.3%); }
  }
  @keyframes kb-left {
    from { transform: scale(1.02) translate(0%,   0%);   }
    to   { transform: scale(1.06) translate(0.9%, 0.3%); }
  }
  @keyframes kb-up {
    from { transform: scale(1.02) translate(0%,    0%);    }
    to   { transform: scale(1.06) translate(0.2%, -0.9%); }
  }
  .kb-right { animation: kb-right 40s linear forwards; }
  .kb-left  { animation: kb-left  40s linear forwards; }
  .kb-up    { animation: kb-up    40s linear forwards; }
`;

const SLIDE_DURATION = 6000;
const DISSOLVE_MS    = 2200;

export function HeroSlider() {
  const [current, setCurrent]           = useState(0);
  const [previous, setPrevious]         = useState<number | null>(null);
  const [slideEpochs, setSlideEpochs]   = useState<number[]>(() =>
    Array(SLIDES.length).fill(0)
  );
  const [loaded, setLoaded]             = useState<Set<number>>(new Set([0, 1]));
  const timerRef                        = useRef<ReturnType<typeof setInterval> | null>(null);

  const preload = useCallback((index: number) => {
    setLoaded((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const activate = useCallback((index: number) => {
    setSlideEpochs((prev) => {
      const next = [...prev];
      next[index] = prev[index] + 1;
      return next;
    });
  }, []);

  const advance = useCallback(() => {
    setCurrent((prev) => {
      const next = (prev + 1) % SLIDES.length;
      setPrevious(prev);
      preload((next + 1) % SLIDES.length);
      activate(next);
      return next;
    });
  }, [preload, activate]);

  useEffect(() => {
    timerRef.current = setInterval(advance, SLIDE_DURATION);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance]);

  const handleDotClick = useCallback((i: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPrevious(current);
    preload((i + 1) % SLIDES.length);
    activate(i);
    setCurrent(i);
    timerRef.current = setInterval(advance, SLIDE_DURATION);
  }, [advance, current, preload, activate]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KB_CSS }} />

      <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {SLIDES.map(({ url, alt, kb }, i) =>
          loaded.has(i) ? (
            <div
              key={i}
              className="absolute inset-0"
              style={{
                opacity: i === current ? 1 : 0,
                transition: `opacity ${DISSOLVE_MS}ms ease-in-out`,
                willChange: "opacity",
              }}
            >
              <img
                key={slideEpochs[i]}
                src={url}
                alt={alt}
                draggable={false}
                className={`absolute inset-0 h-full w-full object-cover ${
                  i === current || i === previous ? kb : ""
                }`}
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
