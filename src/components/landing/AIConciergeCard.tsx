"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Send, Loader2 } from "lucide-react";

type RentalType = "short" | "long";

// Demo fallback when no properties in DB
const DEMO_LINKS = [
  { label: "View All Rentals", href: "/rentals" },
  { label: "Browse Properties", href: "/rentals" },
  { label: "See Availability", href: "/rentals" },
];

export function AIConciergeCard() {
  const [quickLinks, setQuickLinks] = useState<{ label: string; href: string }[]>(DEMO_LINKS);

  useEffect(() => {
    fetch("/api/properties/public?limit=50")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.data?.properties?.length) return;
        const properties = data.data.properties as Array<{ name?: string; address?: { city?: string } }>;
        const seen = new Set<string>();
        const links: { label: string; href: string }[] = [];
        for (const p of properties) {
          const city = p.address?.city?.trim();
          const name = p.name?.trim();
          const label = city || name;
          if (label && !seen.has(label)) {
            seen.add(label);
            links.push({ label, href: `/rentals?search=${encodeURIComponent(label)}` });
            if (links.length >= 4) break;
          }
        }
        if (links.length > 0) setQuickLinks(links);
      })
      .catch(() => {});
  }, []);
  const [activeTab, setActiveTab] = useState<RentalType>("short");
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      setIsLoading(true);
      setResponse(null);

      try {
        const res = await fetch("/api/conversations/ai-assist/public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input.trim(),
            assistantId: "luna",
          }),
        });

        const data = await res.json();
        if (data.success && data.data?.response) {
          setResponse(data.data.response);
        } else {
          setResponse("I apologize, I couldn't process that. Please try again or contact us directly.");
        }
      } catch {
        setResponse("I'm having trouble connecting. Please try again or visit our Contact page.");
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading]
  );

  return (
    <div
      className="w-full max-w-2xl mx-auto rounded-2xl p-4 sm:p-6 md:p-8 transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
    >
      {/* Tabs - glassmorphic, stack on very small screens */}
      <div
        className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-1 p-1.5 rounded-full mb-4 sm:mb-6 w-full sm:w-fit"
        style={{
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("short")}
          className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation ${
            activeTab === "short"
              ? "text-black"
              : "text-black/70 hover:text-black"
          }`}
          style={
            activeTab === "short"
              ? {
                  background: "rgba(255,255,255,0.25)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.4)",
                }
              : undefined
          }
        >
          SHORT TERM
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("long")}
          className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation ${
            activeTab === "long"
              ? "text-black"
              : "text-black/70 hover:text-black"
          }`}
          style={
            activeTab === "long"
              ? {
                  background: "rgba(255,255,255,0.25)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.4)",
                }
              : undefined
          }
        >
          LONG TERM
        </button>
      </div>

      {/* Greeting */}
      <p className="text-black text-sm sm:text-base md:text-lg mb-4 leading-relaxed">
        Welcome to Naples. Are you looking for a vibrant short-term retreat or a
        relaxing long-term rental by the Gulf?
      </p>

      {/* Quick links - glassmorphic, touch-friendly */}
      <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="min-h-[44px] inline-flex items-center px-3 py-2.5 sm:py-1.5 rounded-full text-black text-xs sm:text-sm transition-all hover:bg-white/25 touch-manipulation"
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.25)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="type your inquiry..."
            className="w-full min-h-[48px] px-4 py-3 pr-12 rounded-xl text-base text-black placeholder:text-black/60 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all"
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.25)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-black animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-black" />
            )}
          </button>
        </div>

      </form>

      {/* AI Response */}
      {response && (
        <div className="mt-4 p-4 rounded-xl bg-white/10 border border-white/20 text-black text-sm leading-relaxed animate-fade-in-up">
          {response}
        </div>
      )}
    </div>
  );
}
