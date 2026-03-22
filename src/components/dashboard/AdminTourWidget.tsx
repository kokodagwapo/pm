"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Rocket,
  Bot,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const TOUR_STEP_KEYS = [
  { emoji: "🚀", titleKey: "tour.step.0.title", bodyKey: "tour.step.0.body" },
  { emoji: "📊", titleKey: "tour.step.1.title", bodyKey: "tour.step.1.body" },
  { emoji: "👥", titleKey: "tour.step.2.title", bodyKey: "tour.step.2.body" },
  { emoji: "⚡", titleKey: "tour.step.3.title", bodyKey: "tour.step.3.body" },
  { emoji: "🏠", titleKey: "tour.step.4.title", bodyKey: "tour.step.4.body" },
  { emoji: "💬", titleKey: "tour.step.5.title", bodyKey: "tour.step.5.body" },
  { emoji: "✅", titleKey: "tour.step.6.title", bodyKey: "tour.step.6.body" },
];

const ADMIN_CONTEXT = `You are an expert SmartStartPM admin assistant embedded in the admin dashboard command center. 
You help the Super Admin navigate the platform, understand features, troubleshoot issues, and get the most out of the system.
Key sections of the platform: Admin Dashboard (stats, user management, system health), Properties (portfolio management, units, calendars, pricing), Leases (active leases, invoices, documents, payments), Tenants (profiles, ledgers, applications), Maintenance (requests, emergency, analytics), Analytics (financial, occupancy, maintenance), Messages (direct communication), Calendar (event management), Settings (system configuration, branding, notifications), AI Help (FAQ, AI chat).
Be concise, friendly, and technical when needed. If asked about a specific feature, explain where to find it in the sidebar or which page to navigate to.`;

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function AdminTourWidget() {
  const { t } = useLocalizationContext();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [hasOpened, setHasOpened] = useState(false);
  const [interimText, setInterimText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: t("tour.chat.welcome"),
        },
      ]);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, hasOpened, t]);

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
        body: JSON.stringify({ text: text.replace(/<[^>]+>/g, "").slice(0, 800) }),
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

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content: text.trim() });

      const res = await fetch("/api/conversations/ai-assist/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          assistantId: "admin-tour",
          customContext: ADMIN_CONTEXT,
          history: history.slice(-10),
        }),
      });

      const data = await res.json();
      const reply = data?.data?.response || t("tour.chat.errorRetry");

      const assistantMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: reply };
      setMessages((prev) => [...prev, assistantMsg]);

      if (autoVoice) {
        await playTTS(reply, assistantMsg.id);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: t("tour.chat.error") },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, autoVoice, playTTS, t]);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert(t("tour.voice.notSupported"));
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimText("");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };
    recognition.onerror = () => {
      setIsListening(false);
      setInterimText("");
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += text;
        else interim += text;
      }
      if (interim) setInterimText(interim);
      if (final) {
        setInterimText("");
        sendMessage(final.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, sendMessage, t]);

  const formatContent = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");

  const currentStep = TOUR_STEP_KEYS[step];

  return (
    <>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />

          {/* Panel — full screen on mobile, floating on desktop */}
          <div
            className="
              fixed z-50 flex flex-col overflow-hidden shadow-2xl
              rounded-2xl border border-white/15 bg-slate-950/92 text-white backdrop-blur-xl [-webkit-backdrop-filter:blur(20px)]
              inset-x-2 bottom-[72px] top-16
              sm:inset-auto sm:bottom-24 sm:right-4 sm:top-auto sm:w-[400px] sm:max-h-[600px]
            "
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0">
                🚀
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-semibold text-sm leading-none">{t("tour.header.title")}</p>
                <p className="text-slate-700 text-xs mt-0.5">{t("tour.header.subtitle")}</p>
              </div>
              <LanguageSwitcher variant="dark" align="right" compact className="shrink-0" />
              <button
                onClick={() => setAutoVoice(!autoVoice)}
                className={`p-1.5 rounded-lg transition-colors ${autoVoice ? "bg-white/30 text-white" : "text-white/60 hover:text-white hover:bg-white/20"}`}
                title={autoVoice ? "Auto-voice on" : "Auto-voice off"}
              >
                {autoVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tour step card */}
            <div className="shrink-0 border-b border-white/10 bg-gradient-to-br from-violet-950/50 to-indigo-950/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-2xl leading-none">{currentStep.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-slate-900">{t(currentStep.titleKey)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">{t(currentStep.bodyKey)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1">
                  {TOUR_STEP_KEYS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={`h-1.5 rounded-full transition-all ${i === step ? "w-4 bg-violet-400" : "w-1.5 bg-white/25 hover:bg-white/40"}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-medium text-slate-700">{step + 1}/{TOUR_STEP_KEYS.length}</span>
                  <button
                    onClick={() => setStep((s) => Math.min(TOUR_STEP_KEYS.length - 1, s + 1))}
                    disabled={step === TOUR_STEP_KEYS.length - 1}
                    className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Chat messages */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-950/50 p-3" style={{ minHeight: 0 }}>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={`group relative max-w-[80%] flex flex-col gap-0.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-3 py-2 text-xs leading-relaxed [&_strong]:text-white [&_em]:text-white/90 ${
                        msg.role === "user"
                          ? "rounded-tr-sm bg-violet-600 text-white"
                          : "rounded-tl-sm border border-white/12 bg-white/10 text-white shadow-sm"
                      }`}
                      dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                    />
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => playTTS(msg.content, msg.id)}
                        className={`rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${playingId === msg.id ? "text-violet-300" : "text-white/50 hover:text-white"}`}
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-white/12 bg-white/10 px-3 py-2 shadow-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-300" />
                  </div>
                </div>
              )}
              {isListening && interimText && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-white/15 bg-white/10 px-3 py-2 text-xs italic text-white/90">
                    {interimText}…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Listening indicator */}
            {isListening && (
              <div className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-violet-950/40 px-4 py-2">
                <div className="flex h-4 items-end gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 animate-pulse rounded-sm bg-violet-400"
                      style={{ height: `${[60, 100, 70, 90, 50][i]}%`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-slate-900">{t("tour.chat.listening")}</span>
              </div>
            )}

            {/* Input row */}
            <div className="shrink-0 border-t border-white/10 bg-slate-950/60 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                  }}
                  placeholder={t("tour.chat.placeholder")}
                  className="min-h-[40px] flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs text-white placeholder:text-white/40 transition focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                />
                <button
                  onClick={startListening}
                  className={`min-h-[40px] min-w-[40px] shrink-0 rounded-xl p-2.5 transition-colors ${
                    isListening
                      ? "animate-pulse bg-red-500 text-white shadow-md shadow-red-900/40"
                      : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
                  }`}
                  title={isListening ? "Tap to stop" : "Tap to speak"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="min-h-[40px] min-w-[40px] shrink-0 rounded-xl bg-violet-600 text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Bottom actions */}
            <div className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-slate-950/70 px-3 pb-3 pt-2">
              <Link
                href="/dashboard/ai-help/faq"
                className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-medium text-white transition-colors hover:border-violet-400/40 hover:bg-violet-500/20"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="truncate">{t("tour.action.faqs")}</span>
              </Link>
              <Link
                href="/dashboard/messages"
                className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-medium text-white transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/20"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="truncate">{t("tour.action.messages")}</span>
              </Link>
              {step === TOUR_STEP_KEYS.length - 1 && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/20 py-2.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500/30"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("tour.action.done")}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 touch-manipulation"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
      >
        {isOpen ? (
          <>
            <X className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">{t("tour.toggle.close")}</span>
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">{t("tour.toggle.open")}</span>
            <span className="ml-1 px-2 py-0.5 rounded-lg bg-white/25 text-white text-[10px] font-bold uppercase tracking-wide border border-white/30 hidden sm:inline">
              {t("tour.toggle.start")}
            </span>
          </>
        )}
      </button>
    </>
  );
}
