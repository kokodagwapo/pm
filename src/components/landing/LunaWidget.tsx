"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PropertyContext {
  propertyId: string;
  propertyName: string;
  neighborhood?: string;
  pricePerMonth?: number;
  pricePerNight?: number;
  bedrooms?: number;
  bathrooms?: number;
  availabilityStatus?: string;
}

interface LunaWidgetProps {
  propertyContext?: PropertyContext;
  onRequestBooking?: () => void;
}

const SUGGESTED = [
  "Is this property available?",
  "What's included in the rent?",
  "How do I book this?",
  "Can I speak to someone?",
];

export function LunaWidget({ propertyContext, onRequestBooking }: LunaWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      const greeting: Message = {
        id: "greeting",
        role: "assistant",
        content: propertyContext?.propertyName
          ? `Hi! I'm Luna 👋 I'm here to help you with questions about **${propertyContext.propertyName}**. Ask me anything about the property, pricing, availability, or how to book!\n\nI speak multiple languages — just type in your native tongue and I'll reply in kind. 🌍`
          : `Hi! I'm Luna 👋 I'm your SmartStartPM assistant. I can help you find the perfect rental, answer questions about our properties in Naples, FL, explain pricing, or guide you through the booking process.\n\nI speak multiple languages — just type in your native tongue and I'll reply in kind. 🌍`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, hasGreeted, propertyContext]);

  const buildContext = useCallback(() => {
    const parts: string[] = [];
    if (propertyContext?.propertyName) {
      parts.push(`The visitor is currently viewing the property: "${propertyContext.propertyName}".`);
      if (propertyContext.neighborhood) parts.push(`Neighborhood: ${propertyContext.neighborhood}.`);
      if (propertyContext.pricePerMonth) parts.push(`Monthly rent: $${propertyContext.pricePerMonth.toLocaleString()}.`);
      if (propertyContext.pricePerNight) parts.push(`Nightly rate (approx): $${Math.round(propertyContext.pricePerNight)}/night.`);
      if (propertyContext.bedrooms) parts.push(`Bedrooms: ${propertyContext.bedrooms}.`);
      if (propertyContext.bathrooms) parts.push(`Bathrooms: ${propertyContext.bathrooms}.`);
      if (propertyContext.availabilityStatus) parts.push(`Current status: ${propertyContext.availabilityStatus}.`);
      parts.push(
        "If the visitor wants to book or check specific date availability, encourage them to use the availability calendar on the page. If they want to speak with someone, let them know they can fill out the inquiry form below the calendar or call our office."
      );
    } else {
      parts.push(
        "You are on the SmartStartPM rentals listing page. The visitor is browsing available properties in Naples, FL and surrounding areas. Help them find the right rental by asking about their needs (beds, baths, budget, dates, neighborhood). You can describe our portfolio of luxury condos, single-family homes, and beachfront villas. Encourage them to click on any property card to see full details, or to contact us directly."
      );
    }
    parts.push(
      "IMPORTANT: You are multilingual. Detect the language the visitor is writing in and always reply in that same language. If they write in Spanish, reply in Spanish. If they write in French, reply in French. Match their language exactly — never switch to English unless they write in English first."
    );
    return parts.join(" ");
  }, [propertyContext]);

  const playTTS = useCallback(async (text: string, msgId: string) => {
    if (playingId === msgId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    setPlayingId(msgId);
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      await audio.play();
    } catch {
      setPlayingId(null);
    }
  }, [playingId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "greeting")
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content: text.trim() });

      const res = await fetch("/api/conversations/ai-assist/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          assistantId: "luna",
          customContext: buildContext(),
          history: history.slice(-10),
        }),
      });

      const data = await res.json();
      const reply = data?.data?.response || "I'm having trouble connecting right now. Please try again!";

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (autoVoice) {
        await playTTS(reply, assistantMsg.id);
      }

      if (
        text.toLowerCase().includes("book") ||
        text.toLowerCase().includes("inquir") ||
        text.toLowerCase().includes("contact") ||
        text.toLowerCase().includes("speak") ||
        text.toLowerCase().includes("call")
      ) {
        onRequestBooking?.();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "I'm having trouble connecting. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, buildContext, autoVoice, playTTS, onRequestBooking]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatContent = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");

  return (
    <>
      {/* ── Chat panel ───────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />

          {/*
            Mobile:  fills from just below the header to just above the trigger button
            Desktop: floating card, anchored bottom-right
          */}
          <div
            className="fixed z-50 flex flex-col bg-white border border-slate-200 shadow-2xl overflow-hidden
              rounded-2xl
              inset-x-2 bottom-20 top-[56px]
              sm:inset-auto sm:top-auto sm:right-4 sm:bottom-24 sm:w-[360px] sm:max-h-[560px]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-sky-500 to-violet-500 shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
                L
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-none">Luna</p>
                <p className="text-white/70 text-xs mt-0.5">AI Assistant · Multilingual · Online</p>
              </div>
              <button
                onClick={() => setAutoVoice(!autoVoice)}
                className={`p-1.5 rounded-lg transition-colors ${autoVoice ? "bg-white/30 text-white" : "text-white/60 hover:text-white hover:bg-white/20"}`}
                title={autoVoice ? "Voice on" : "Voice off"}
              >
                {autoVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              {/* Minimalist close button in header */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50" style={{ minHeight: 0 }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                      L
                    </div>
                  )}
                  <div className={`group relative max-w-[80%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-sky-500 text-white rounded-tr-sm"
                          : "bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-sm"
                      }`}
                      dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                    />
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => playTTS(msg.content, msg.id)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full ${
                          playingId === msg.id ? "text-sky-500 bg-sky-50" : "text-slate-400 hover:text-sky-500 hover:bg-sky-50"
                        }`}
                        title="Listen"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    L
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested prompts */}
            {messages.length <= 1 && (
              <div className="px-3 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 shrink-0">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors touch-manipulation"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask in any language…"
                className="flex-1 text-sm px-3 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Trigger / close button ─────────────────────────── */}
      <div className="fixed bottom-5 right-4 z-50">
        {/* Open-state pulse rings */}
        {!isOpen && (
          <>
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 opacity-40 animate-ping" />
            <span
              className="absolute inset-[-6px] rounded-full bg-gradient-to-br from-sky-400 to-violet-500 opacity-20 animate-ping"
              style={{ animationDelay: "0.4s" }}
            />
          </>
        )}

        {isOpen ? (
          /* ── Minimalist close button — small pill with subtle pulse ── */
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close Luna"
            className="relative flex items-center justify-center w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200/80 shadow-md text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          /* ── Open button — gradient bubble ── */
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Chat with Luna"
            className="relative w-16 h-16 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-violet-500 hover:scale-110 shadow-sky-400/40 transition-all duration-300"
          >
            <div className="relative">
              <MessageCircle className="w-7 h-7 text-white" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
            </div>
          </button>
        )}
      </div>
    </>
  );
}
