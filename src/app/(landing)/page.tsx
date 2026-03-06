/**
 * SmartStartPM Landing Page - Naples Living
 * Full-viewport hero with video background, no scroll
 */

import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { AIConciergeCard } from "@/components/landing/AIConciergeCard";
import { NoScrollWrapper } from "@/components/landing/NoScrollWrapper";

export default function LandingPage() {
  return (
    <NoScrollWrapper>
    <div className="fixed inset-0 h-screen w-screen overflow-y-auto overflow-x-hidden md:overflow-hidden bg-slate-900">
      {/* Video background - full hero */}
      <HeroVideo />

      {/* Header */}
      <LandingHeader />

      {/* Hero content - scrollable on mobile when content overflows */}
      <main className="relative z-10 flex flex-col items-center justify-start md:justify-center min-h-full px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24">
        {/* Title */}
        <h1
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-[var(--font-playfair)] text-white text-center mb-3 sm:mb-4 drop-shadow-lg animate-fade-in-up"
          style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
        >
          Naples Living
        </h1>

        {/* Sub-tagline */}
        <p
          className="text-white/95 text-xs sm:text-sm md:text-base tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] uppercase text-center mb-8 sm:mb-12 max-w-2xl px-2 animate-fade-in-up drop-shadow-md"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4), 0 2px 16px rgba(0,0,0,0.2)" }}
        >
          Your Florida Escape, From Weekend Getaways to Seasonal Stays
        </p>

        {/* AI Concierge Box */}
        <div className="animate-fade-in-up w-full max-w-2xl mx-auto px-0 sm:px-2">
          <AIConciergeCard />
        </div>
      </main>

    </div>
    </NoScrollWrapper>
  );
}
