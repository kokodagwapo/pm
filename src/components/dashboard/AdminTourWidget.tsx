"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
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

const TOUR_STEPS = [
  {
    emoji: "🚀",
    title: "Welcome to your Command Center",
    body: "You have the keys to the kingdom! This tour will walk you through all the powerful tools at your disposal. Use the chat or voice assistant below anytime for help.",
  },
  {
    emoji: "📊",
    title: "Live Stats at a Glance",
    body: "The six stat cards at the top show real-time KPIs — total users, properties, revenue, system health, active sessions, and database status. They refresh automatically.",
  },
  {
    emoji: "👥",
    title: "User Management",
    body: "The Users tab shows all registered users with their roles, status, and last activity. You can activate, suspend, or view any account from the action menu on the right.",
  },
  {
    emoji: "⚡",
    title: "System Health & Alerts",
    body: "The Overview tab surfaces real-time system alerts and recent activity. The System tab gives you deeper service-by-service health metrics and database status.",
  },
  {
    emoji: "🏠",
    title: "Properties & Leases",
    body: "Head to Properties in the sidebar to manage your full portfolio. Each property has its own calendar, unit management, pricing rules, and booking blocks.",
  },
  {
    emoji: "💬",
    title: "Messages & AI Assistant",
    body: "Use Messages to communicate directly with tenants and owners. The AI Help section gives you an FAQ and an AI chat assistant that understands your entire platform.",
  },
  {
    emoji: "✅",
    title: "You're all set!",
    body: "That's the full tour. Remember — the AI assistant below is always here to help you navigate, answer questions, or look up anything in the system.",
  },
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
          content: "Hi! I'm your admin AI assistant. I'm here alongside this guided tour to answer any questions, explain features, or help you navigate SmartStartPM. Ask me anything — by text or voice!",
        },
      ]);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, hasOpened]);

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
      const reply = data?.data?.response || "I'm having trouble connecting right now. Please try again!";

      const assistantMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: reply };
      setMessages((prev) => [...prev, assistantMsg]);

      if (autoVoice) {
        await playTTS(reply, assistantMsg.id);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, autoVoice, playTTS]);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Speech recognition is not supported in your browser. Try Chrome or Edge.");
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
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setInterimText(interim);
      if (final) {
        setInterimText("");
        sendMessage(final.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, sendMessage]);

  const formatContent = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");

  const currentStep = TOUR_STEPS[step];

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-200"
          style={{ maxHeight: "600px" }}>

          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg shrink-0">
              🚀
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-none">Admin Tour Guide</p>
              <p className="text-white/70 text-xs mt-0.5">AI Assistant · Voice & Chat · Online</p>
            </div>
            <button
              onClick={() => setAutoVoice(!autoVoice)}
              className={`p-1.5 rounded-lg transition-colors ${autoVoice ? "bg-white/30 text-white" : "text-white/60 hover:text-white hover:bg-white/20"}`}
              title={autoVoice ? "Auto-voice on — click to mute" : "Auto-voice off — click to enable"}
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

          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border-b border-slate-100 px-4 py-3 shrink-0">
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5 shrink-0">{currentStep.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm leading-snug">{currentStep.title}</p>
                <p className="text-slate-600 text-xs leading-relaxed mt-1">{currentStep.body}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === step ? "bg-violet-600 w-4" : "bg-slate-300 hover:bg-slate-400"}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white/80 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 font-medium">{step + 1}/{TOUR_STEPS.length}</span>
                <button
                  onClick={() => setStep((s) => Math.min(TOUR_STEPS.length - 1, s + 1))}
                  disabled={step === TOUR_STEPS.length - 1}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white/80 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50" style={{ minHeight: 0, maxHeight: "240px" }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`group relative max-w-[80%] flex flex-col gap-0.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white rounded-tr-sm"
                        : "bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm"
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                  />
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => playTTS(msg.content, msg.id)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${playingId === msg.id ? "text-violet-600" : "text-slate-400 hover:text-violet-500"}`}
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
                  <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                </div>
              </div>
            )}
            {isListening && interimText && (
              <div className="flex justify-end">
                <div className="bg-violet-100 border border-violet-200 text-violet-700 rounded-2xl rounded-tr-sm px-3 py-2 text-xs italic max-w-[80%]">
                  {interimText}…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {isListening && (
            <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 border-t border-violet-100 shrink-0">
              <div className="flex gap-0.5 items-end h-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-violet-500 rounded-full animate-pulse"
                    style={{ height: `${[60, 100, 70, 90, 50][i]}%`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-xs text-violet-600 font-medium">Listening… speak now</span>
            </div>
          )}

          <div className="px-3 py-2.5 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
                placeholder="Ask anything about the dashboard…"
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 placeholder:text-slate-400 transition"
              />
              <button
                onClick={startListening}
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  isListening
                    ? "bg-red-500 text-white shadow-md shadow-red-200 animate-pulse"
                    : "bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600"
                }`}
                title={isListening ? "Tap to stop" : "Tap to speak"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-3 pb-3 pt-1 bg-white flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/ai-help/faq"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-violet-600 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-xl py-2 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Browse FAQs
            </Link>
            <Link
              href="/dashboard/messages"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl py-2 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Message Manager
            </Link>
            {step === TOUR_STEPS.length - 1 && (
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl py-2 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Done
              </button>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
      >
        {isOpen ? (
          <>
            <X className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">Close</span>
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">Tour Guide</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-bold uppercase tracking-wide border border-white/30">
              START HERE
            </span>
          </>
        )}
      </button>
    </>
  );
}
