"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Send,
  RotateCcw,
  Sparkles,
  CalendarDays,
  BedDouble,
  DollarSign,
  PawPrint,
  Waves,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
}

interface LunaWidgetProps {
  propertyContext?: any;
}

const HEIDI_WIDGET_STORAGE_KEY = "heidi-widget-state-v1";

const SHORT_TRANSCRIPT_ALLOWLIST = new Set([
  "hi",
  "hey",
  "hello",
  "yes",
  "no",
  "yep",
  "nope",
  "pricing",
  "book",
  "woodland",
]);

const NOISE_TRANSCRIPT_BLOCKLIST = new Set([
  "you",
  "thank you",
  "thanks",
  "ok",
  "okay",
  "yeah",
  "yup",
  "mm hmm",
  "uh huh",
  "you're welcome",
  "your welcome",
  "welcome",
  "bye",
  "goodbye",
]);

function classifyTranscriptIntent(rawTranscript: string) {
  const transcript = rawTranscript.trim();
  const normalized = transcript
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'?!.:-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return { action: "ignore" as const };
  }

  if (NOISE_TRANSCRIPT_BLOCKLIST.has(normalized)) {
    return { action: "ignore" as const };
  }

  const tokens = normalized.split(" ").filter(Boolean);
  const alphaOnly = normalized.replace(/[^a-z]/gi, "");

  if (tokens.length === 1) {
    if (SHORT_TRANSCRIPT_ALLOWLIST.has(tokens[0])) {
      return { action: "respond" as const, cleanedTranscript: transcript };
    }

    if (alphaOnly.length <= 4) {
      return { action: "ignore" as const };
    }

    return { action: "respond" as const, cleanedTranscript: transcript };
  }

  if (alphaOnly.length < 3) {
    return { action: "ignore" as const };
  }

  if (tokens.length >= 2 && alphaOnly.length >= 5) {
    return { action: "respond" as const, cleanedTranscript: transcript };
  }

  return { action: "clarify" as const };
}

export function LunaWidget({ propertyContext }: LunaWidgetProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState("English");
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [livePropertyContext, setLivePropertyContext] = useState<any>(
    propertyContext ?? null
  );

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  const pendingTextRef = useRef<string | null>(null);
  const disconnectTimeoutRef = useRef<number | null>(null);
  const speechStartedAtRef = useRef<number | null>(null);
  const ignoreNextTranscriptRef = useRef(false);
  const manualCloseRef = useRef(false);
  const isStoppingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(HEIDI_WIDGET_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      manualCloseRef.current = Boolean(saved?.manualClose);
      setIsOpen(Boolean(saved?.isOpen) && !saved?.manualClose);
      if (Array.isArray(saved?.messages)) {
        setMessages(
          saved.messages.map((message: any) => ({
            ...message,
            timestamp: new Date(message.timestamp),
          }))
        );
      }
    } catch {
      // Ignore corrupted persisted state.
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        HEIDI_WIDGET_STORAGE_KEY,
        JSON.stringify({
          isOpen,
          manualClose: manualCloseRef.current,
          messages: messages.slice(-40),
        })
      );
    } catch {
      // Ignore storage errors.
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (propertyContext) {
      setLivePropertyContext(propertyContext);
    }
  }, [propertyContext]);

  useEffect(() => {
    const handlePropertyContext = (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      setLivePropertyContext(customEvent.detail ?? null);
    };

    window.addEventListener(
      "heidi:set-property-context",
      handlePropertyContext as EventListener
    );

    return () => {
      window.removeEventListener(
        "heidi:set-property-context",
        handlePropertyContext as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith("/properties/")) {
      setLivePropertyContext(null);
    }
  }, [pathname]);

  const sendEvent = useCallback((event: any) => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      dcRef.current.send(JSON.stringify(event));
    }
  }, []);

  const auditToolCall = useCallback(async (payload: {
    toolName: string;
    status: "success" | "error";
    args?: Record<string, unknown>;
    responsePreview?: string;
  }) => {
    try {
      await fetch("/api/luna/tool-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          currentPath: pathname,
        }),
      });
    } catch {
      // Audit logging should never break the conversation flow.
    }
  }, [pathname]);

  const upsertAssistantDraft = useCallback((chunk: string, done = false) => {
    let draftId = streamingAssistantIdRef.current;
    if (!draftId) {
      draftId = `assistant-stream-${Date.now()}`;
      streamingAssistantIdRef.current = draftId;
      const messageId = draftId;
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          content: chunk,
          timestamp: new Date(),
          status: done ? "sent" : "sending",
        },
      ]);
      return;
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.id === draftId
          ? {
              ...message,
              content: done ? message.content : `${message.content}${chunk}`,
              status: done ? "sent" : "sending",
            }
          : message
      )
    );
  }, []);

  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const finalizeAssistantTranscript = useCallback((transcript: string) => {
    const cleanedTranscript = transcript.trim();
    if (!cleanedTranscript) return;

    const draftId = streamingAssistantIdRef.current;
    if (draftId) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === draftId
            ? {
                ...message,
                content: cleanedTranscript,
                status: "sent",
              }
            : message
        )
      );
      streamingAssistantIdRef.current = null;
      return;
    }

    appendMessage({
      id: `assistant-final-${Date.now()}`,
      role: "assistant",
      content: cleanedTranscript,
      timestamp: new Date(),
      status: "sent",
    });
  }, [appendMessage]);

  const keepWidgetOpen = useCallback(() => {
    if (manualCloseRef.current) return;
    setIsOpen(true);
  }, []);

  const openWidget = useCallback(() => {
    manualCloseRef.current = false;
    setIsOpen(true);
  }, []);

  const closeWidget = useCallback(() => {
    manualCloseRef.current = true;
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if ((isVoiceActive || isConnecting || isSpeaking) && !manualCloseRef.current) {
      setIsOpen(true);
    }
  }, [isVoiceActive, isConnecting, isSpeaking]);

  const clearDisconnectTimeout = useCallback(() => {
    if (disconnectTimeoutRef.current !== null) {
      window.clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }
  }, []);

  const dispatchUserText = useCallback((text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== "open") {
      return false;
    }

    const directedText =
      activeLanguage && activeLanguage !== "English"
        ? `Reply in ${activeLanguage}. Keep your response fully in ${activeLanguage} even if the user's message is in English.\n\nUser message: ${text}`
        : text;

    sendEvent({ type: "response.cancel" });
    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: directedText }],
      },
    });
    sendEvent({ type: "response.create" });
    return true;
  }, [activeLanguage, sendEvent]);

  const handleToolCall = useCallback(async (call: any) => {
    console.log("Executing Tool Call:", call);
    let responseData;
    let parsedArgs: Record<string, unknown> = {};
    try {
      const args = JSON.parse(call.arguments);
      parsedArgs = args;
      if (call.name === "get_available_properties") {
        const res = await fetch(`/api/properties/public/available-for-stay?checkIn=${args.checkIn}&checkOut=${args.checkOut}`);
        responseData = await res.json();
      } else if (call.name === "calculate_total_pricing") {
        const pricingBody = {
          propertyId: args.propertyId,
          unitId: args.unitId,
          startDate: args.checkIn,
          endDate: args.checkOut,
          couponCode: args.couponCode,
        };
        const res = await fetch("/api/pricing/calculate-public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pricingBody)
        });
        responseData = await res.json();
      } else if (call.name === "search_knowledge_base") {
        const res = await fetch(`/api/luna/search-knowledge?query=${encodeURIComponent(args.query)}`);
        responseData = await res.json();
      } else if (call.name === "create_maintenance_ticket") {
        const res = await fetch("/api/tenant/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args)
        });
        responseData = await res.json();
      } else if (call.name === "get_property_insights") {
        const res = await fetch(`/api/properties/public/${args.propertyId}`);
        responseData = await res.json();
      } else if (call.name === "search_all_listings") {
        const res = await fetch(`/api/luna/search-all?query=${encodeURIComponent(args.query)}`);
        responseData = await res.json();
      } else if (call.name === "get_user_profile") {
        const res = await fetch("/api/user/profile");
        responseData = await res.json();
      } else if (call.name === "book_property") {
        // Map Heidi's tool arguments to the backend API expected fields
        const bookingBody = {
          propertyId: args.propertyId,
          unitId: args.unitId,
          requestedStartDate: args.checkIn,
          requestedEndDate: args.checkOut,
          tenantMessage: args.message
        };
        const res = await fetch("/api/rental-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingBody)
        });
        responseData = await res.json();
      } else if (call.name === "get_calendar_events") {
        const search = new URLSearchParams();
        if (args.startDate) search.set("startDate", String(args.startDate));
        if (args.endDate) search.set("endDate", String(args.endDate));
        if (args.propertyId) search.set("propertyId", String(args.propertyId));
        if (args.search) search.set("search", String(args.search));
        const res = await fetch(`/api/calendar/events?${search.toString()}`);
        responseData = await res.json();
      } else if (call.name === "search_faqs") {
        const search = new URLSearchParams();
        if (args.search) search.set("search", String(args.search));
        if (args.category) search.set("category", String(args.category));
        const res = await fetch(`/api/luna/search-faqs?${search.toString()}`);
        responseData = await res.json();
      } else {
        responseData = { error: "Tool not found" };
      }
    } catch (err) {
      responseData = { error: "Execution failed" };
    }

    await auditToolCall({
      toolName: call.name,
      status: responseData?.error ? "error" : "success",
      args: parsedArgs,
      responsePreview: JSON.stringify(responseData).slice(0, 500),
    });

    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(responseData)
      }
    });
    
    sendEvent({ type: "response.create" });
  }, [auditToolCall, sendEvent]);

  const handleServerEvent = useCallback(async (event: any) => {
    switch (event.type) {
      // Real-time audio transcript streaming — fires as Heidi speaks
      case "response.audio_transcript.delta":
        if (event.delta) {
          keepWidgetOpen();
          upsertAssistantDraft(event.delta, false);
        }
        break;
      // Finalize when Heidi finishes speaking
      case "response.audio_transcript.done":
        keepWidgetOpen();
        if (event.transcript) {
          finalizeAssistantTranscript(event.transcript);
        } else {
          streamingAssistantIdRef.current = null;
        }
        break;
      // Clean up any dangling draft at end of full response cycle
      case "response.done":
        streamingAssistantIdRef.current = null;
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          if (ignoreNextTranscriptRef.current) {
            ignoreNextTranscriptRef.current = false;
            break;
          }

          const result = classifyTranscriptIntent(event.transcript);

          if (result.action === "respond" && result.cleanedTranscript) {
            appendMessage({
              id: Date.now().toString(),
              role: "user",
              content: result.cleanedTranscript,
              timestamp: new Date(),
              status: "sent",
            });
            dispatchUserText(result.cleanedTranscript);
          } else if (result.action === "clarify") {
            appendMessage({
              id: Date.now().toString(),
              role: "assistant",
              content: "I did not catch that clearly. Please say it again.",
              timestamp: new Date(),
              status: "sent",
            });
          }
        }
        break;
      case "conversation.item.input_audio_transcription.failed":
        // Most failures here are ambient noise or clipped speech; ignore instead of speaking.
        break;
      case "response.function_call_arguments.done":
        handleToolCall(event);
        break;
      case "response.audio.done":
        setIsSpeaking(false);
        break;
      case "response.audio.started":
        keepWidgetOpen();
        setIsSpeaking(true);
        break;
      case "input_audio_buffer.speech_started":
        ignoreNextTranscriptRef.current = false;
        speechStartedAtRef.current = Date.now();
        setIsListening(true);
        break;
      case "input_audio_buffer.speech_stopped":
        if (speechStartedAtRef.current) {
          const speechDuration = Date.now() - speechStartedAtRef.current;
          if (speechDuration < 650) {
            ignoreNextTranscriptRef.current = true;
          }
        }
        speechStartedAtRef.current = null;
        setIsListening(false);
        break;
      case "conversation.interrupted":
        setIsSpeaking(false);
        break;
      case "error":
        const msg = event.error?.message || event.error || "An error occurred";
        setError(msg);
        if (/session|token|unauthorized|authentication|connection failed/i.test(msg)) {
          stopVoice();
        }
        break;
    }
  }, [appendMessage, dispatchUserText, finalizeAssistantTranscript, handleToolCall, keepWidgetOpen, upsertAssistantDraft]);

  const stopVoice = useCallback(() => {
    isStoppingRef.current = true;
    clearDisconnectTimeout();
    speechStartedAtRef.current = null;
    ignoreNextTranscriptRef.current = false;
    if (pcRef.current) pcRef.current.close();
    if (dcRef.current) dcRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.remove();
    }
    pcRef.current = null;
    dcRef.current = null;
    streamRef.current = null;
    audioRef.current = null;
    setIsVoiceActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setIsMicMuted(false);
    streamingAssistantIdRef.current = null;
    window.setTimeout(() => {
      isStoppingRef.current = false;
    }, 0);
  }, [clearDisconnectTimeout]);

  const toggleMicMute = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleSpeakerMute = useCallback(() => {
    if (audioRef.current) {
      const nextMuted = !audioRef.current.muted;
      audioRef.current.muted = nextMuted;
      setIsSpeakerMuted(nextMuted);
      return;
    }

    setIsSpeakerMuted((prev) => !prev);
  }, []);

  const startVoice = useCallback(async () => {
    if (isConnecting || pcRef.current || dcRef.current) {
      keepWidgetOpen();
      return;
    }

    isStoppingRef.current = false;
    manualCloseRef.current = false;
    keepWidgetOpen();
    setIsVoiceActive(true);
    setIsConnecting(true);
    setError(null);

    try {
      const sessionResponse = await fetch("/api/luna/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPath: pathname,
          currentSection: pathname?.split("/")[1] || "public",
          pageTitle: typeof document !== "undefined" ? document.title : "",
          propertyContext: livePropertyContext,
        }),
      });
      const sessionData = await sessionResponse.json();
      
      if (!sessionResponse.ok || !sessionData.client_secret?.value) {
        throw new Error(sessionData.error?.message || "Failed to get session token");
      }

      const EPHEMERAL_KEY = sessionData.client_secret.value;
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (isStoppingRef.current) return;
        const state = pc.connectionState;

        if (state === "connected") {
          clearDisconnectTimeout();
          setError(null);
          return;
        }

        if (state === "connecting") {
          clearDisconnectTimeout();
          return;
        }

        if (state === "disconnected") {
          clearDisconnectTimeout();
          setError("Connection is unstable. Reconnecting...");
          disconnectTimeoutRef.current = window.setTimeout(() => {
            if (pcRef.current?.connectionState === "disconnected") {
              setError("The call was disconnected.");
              stopVoice();
            }
          }, 20000);
          return;
        }

        if (state === "failed" || state === "closed") {
          setError("The call ended. Please try again.");
          stopVoice();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (isStoppingRef.current) return;
        const iceState = pc.iceConnectionState;

        if (iceState === "connected" || iceState === "completed") {
          clearDisconnectTimeout();
          setError(null);
          return;
        }

        if (iceState === "disconnected") {
          clearDisconnectTimeout();
          disconnectTimeoutRef.current = window.setTimeout(() => {
            if (pcRef.current?.iceConnectionState === "disconnected") {
              setError("The call was disconnected.");
              stopVoice();
            }
          }, 20000);
          return;
        }

        if (iceState === "failed") {
          setError("The call ended. Please try again.");
          stopVoice();
        }
      };

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.hidden = true;
      audioEl.setAttribute("playsinline", "true");
      audioEl.muted = isSpeakerMuted;
      document.body.appendChild(audioEl);
      audioRef.current = audioEl;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 24000,
        },
      });
      streamRef.current = stream;
      pc.addTrack(stream.getAudioTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => { handleServerEvent(JSON.parse(e.data)); };
      dc.onclose = () => {
        if (isStoppingRef.current) return;
        if (
          pcRef.current?.connectionState === "connected" ||
          pcRef.current?.connectionState === "connecting" ||
          pcRef.current?.connectionState === "disconnected"
        ) {
          return;
        }
        setError("The voice session closed.");
      };

      dc.onopen = () => {
        setIsConnecting(false);
        setIsListening(true);
        if (pendingTextRef.current) {
          const pendingText = pendingTextRef.current;
          pendingTextRef.current = null;
          dispatchUserText(pendingText);
        } else {
          sendEvent({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "Greet the user warmly. Say welcome to VMS Florida Property Management and briefly offer to help." }]
            }
          });
          sendEvent({ type: "response.create" });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${EPHEMERAL_KEY}`, "Content-Type": "application/sdp" },
      });

      if (!sdpResponse.ok) throw new Error("OpenAI connection failed");

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    } catch (err: any) {
      setError(err.message || "Failed to connect to OpenAI");
      stopVoice();
    }
  }, [clearDisconnectTimeout, dispatchUserText, handleServerEvent, isConnecting, isSpeakerMuted, keepWidgetOpen, livePropertyContext, pathname, stopVoice, sendEvent]);

  const switchLanguage = useCallback(
    (language: string) => {
      setActiveLanguage(language);
      keepWidgetOpen();

      const instruction = `Switch immediately to ${language}. From now on, speak only in ${language} unless the user asks you to change languages again. Keep the same warm, friendly voice and continue naturally.`;

      if (!dispatchUserText(instruction)) {
        pendingTextRef.current = instruction;
        startVoice();
      }
    },
    [dispatchUserText, keepWidgetOpen, startVoice]
  );

  const handleSendText = useCallback((overrideText?: string) => {
    const trimmedInput = (overrideText ?? textInput).trim();
    if (!trimmedInput) return;
    const newMessage: Message = { id: Date.now().toString(), role: "user", content: trimmedInput, timestamp: new Date(), status: "sent" };
    setMessages(prev => [...prev, newMessage]);
    if (!overrideText) setTextInput("");
    if (!dispatchUserText(trimmedInput)) {
      pendingTextRef.current = trimmedInput;
      startVoice();
    }
  }, [dispatchUserText, startVoice, textInput]);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap');
        
        .heidi-widget {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        @keyframes subtle-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Launcher Button */}
      {!isOpen && (
        <button 
          onClick={openWidget}
          className="fixed bottom-8 right-8 z-50 group flex h-16 w-16 items-center justify-center rounded-[2rem] bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-110 active:scale-95"
        >
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl scale-125" />
          <div className="relative z-10 bg-slate-900 rounded-[1.8rem] w-14 h-14 flex items-center justify-center border border-white/10">
            <Sparkles className="h-6 w-6 text-sky-400 group-hover:text-white transition-colors" />
          </div>
          {messages.length > 0 && (
            <div className="absolute -top-2 -right-2 h-6 min-w-[24px] px-1.5 bg-sky-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
              {messages.length}
            </div>
          )}
        </button>
      )}

      {/* Main Widget */}
      <div className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) origin-bottom-right heidi-widget",
        isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-8 pointer-events-none"
      )}>
        <div className="w-[420px] h-[680px] bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden border border-slate-100/60 relative">
          
          {/* Header */}
          <div className="px-6 py-5 flex items-center justify-between shrink-0 relative z-30 border-b border-slate-100/80 bg-white/90 backdrop-blur-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className={cn(
                  "h-12 w-12 rounded-[1.15rem] p-[2px] transition-all duration-700",
                  isVoiceActive ? "bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-600 shadow-lg shadow-sky-100" : "bg-slate-200"
                )}>
                  <div className="h-full w-full rounded-[1rem] overflow-hidden bg-white">
                    <img src="/images/heidi-avatar.png" alt="Heidi" className="h-full w-full object-cover" />
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold tracking-tight text-slate-900">Heidi</h3>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-slate-400">AI BestFriend Agent</p>
              </div>
            </div>

            <button onClick={closeWidget} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-red-500 transition-all shadow-sm shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 flex flex-col min-h-0 relative px-2 bg-slate-50/20">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scrollbar-hide">
              {messages.length === 0 && (
                <div className="rounded-[2rem] border border-slate-100 bg-white/90 px-5 py-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-300 mb-1">Ask me anything</p>
                  <p className="text-[13px] font-medium leading-relaxed text-slate-400 mb-4">
                    I know every property, price, and corner of Naples. Try one of these:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "What's available this month?", icon: <CalendarDays className="w-3.5 h-3.5" />, color: "hover:border-sky-200 hover:text-sky-700 hover:bg-sky-50/70" },
                      { label: "Show 2-bedroom condos", icon: <BedDouble className="w-3.5 h-3.5" />, color: "hover:border-violet-200 hover:text-violet-700 hover:bg-violet-50/70" },
                      { label: "How much per night?", icon: <DollarSign className="w-3.5 h-3.5" />, color: "hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50/70" },
                      { label: "Are pets welcome?", icon: <PawPrint className="w-3.5 h-3.5" />, color: "hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50/70" },
                      { label: "Which homes have a pool?", icon: <Waves className="w-3.5 h-3.5" />, color: "hover:border-sky-200 hover:text-sky-700 hover:bg-sky-50/70" },
                      { label: "Closest property to beach?", icon: <MapPin className="w-3.5 h-3.5" />, color: "hover:border-rose-200 hover:text-rose-700 hover:bg-rose-50/70" },
                    ].map((s) => (
                      <button
                        key={s.label}
                        onClick={() => handleSendText(s.label)}
                        className={cn(
                          "px-3.5 py-3 rounded-[1.2rem] bg-slate-50/80 border border-slate-100 text-left transition-all group flex flex-col gap-2",
                          s.color
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="w-7 h-7 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-current group-hover:text-inherit transition-colors shadow-sm">
                            {s.icon}
                          </div>
                          <ArrowRight className="w-3 h-3 text-slate-200 group-hover:text-current group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 group-hover:text-inherit leading-snug transition-colors">
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={cn("flex flex-col group", m.role === "user" ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[85%] px-5 py-3.5 rounded-[1.75rem] text-[14px] font-medium leading-relaxed shadow-sm transition-all duration-300",
                    m.role === "user"
                      ? "bg-slate-900 text-white rounded-tr-none shadow-indigo-100"
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-100 group-hover:border-slate-200"
                  )}>
                    {m.content}
                    {m.role === "assistant" && m.status === "sending" && (
                      <span className="inline-block w-[2px] h-[14px] bg-sky-400 ml-0.5 align-middle animate-pulse rounded-full" />
                    )}
                  </div>
                  <span className="mt-2 text-[9px] font-black text-slate-300 uppercase tracking-widest px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.role === "user" ? "You" : "Heidi"} • {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {isSpeaking && !messages.some(m => m.role === "assistant" && m.status === "sending") && (
                <div className="flex flex-col items-start">
                  <div className="px-5 py-3.5 bg-white border border-sky-100 rounded-[1.75rem] rounded-tl-none shadow-sm shadow-sky-50 flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '180ms' }} />
                    <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '360ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="px-6 py-5 shrink-0 bg-white border-t border-slate-50/50 backdrop-blur-xl relative z-30">
            <div className="flex flex-col gap-4">
              {/* Chat Input */}
              <div className="flex items-center gap-3 bg-slate-100/40 rounded-[1.8rem] p-2 border border-slate-200/40 transition-all focus-within:bg-white focus-within:border-sky-200 focus-within:shadow-lg focus-within:shadow-sky-500/5">
                <input 
                  type="text" 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type anything..."
                  className="flex-1 bg-transparent border-none py-3 px-4 text-[14px] font-semibold text-slate-700 outline-none placeholder:text-slate-400 placeholder:text-[11px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
                />
                <button onClick={handleSendText} className={cn("w-11 h-11 rounded-2xl flex items-center justify-center transition-all transform", textInput.trim() ? "bg-sky-500 text-white shadow-xl shadow-sky-500/20 scale-100 rotate-0" : "bg-slate-200 text-slate-400 scale-90 rotate-12 cursor-not-allowed")}>
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {!isVoiceActive && (
                <button onClick={startVoice} disabled={isConnecting} className="w-full h-16 rounded-[2rem] flex items-center justify-center gap-4 bg-slate-950 text-white border border-slate-800 shadow-lg shadow-slate-200/40 hover:border-slate-700 hover:bg-slate-900 active:scale-[0.99] transition-all">
                  <div className="flex items-center gap-4">
                    {isConnecting ? <Loader2 className="w-6 h-6 animate-spin text-sky-400" /> : (
                      <>
                        <div className="w-10 h-10 rounded-[1.2rem] border border-white/10 bg-white/[0.06] flex items-center justify-center">
                          <Mic className="h-[18px] w-[18px] text-sky-300" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Voice</span>
                          <span className="text-sm font-semibold tracking-tight">Speak with Heidi</span>
                        </div>
                      </>
                    )}
                  </div>
                </button>
              )}

              {isVoiceActive && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <div className="min-h-20 rounded-[1.75rem] border border-slate-200/80 bg-slate-50/85 p-4 flex items-center justify-between shadow-[0_12px_35px_rgba(15,23,42,0.08)] relative overflow-hidden">
                    {!isMicMuted && isListening && (
                      <div className="absolute inset-0 bg-gradient-to-r from-sky-500/6 via-transparent to-indigo-500/6 animate-pulse pointer-events-none" />
                    )}
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 border",
                        isMicMuted
                          ? "bg-white text-rose-500 border-rose-100"
                          : "bg-white text-sky-500 border-sky-100 shadow-sm"
                      )}>
                        {isMicMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">
                          Voice Active
                        </span>
                        <span className="text-[13px] font-semibold text-slate-900 mt-1.5">
                          {isSpeakerMuted
                            ? "Heidi muted"
                            : isMicMuted
                              ? "Mic muted"
                              : isSpeaking
                                ? "Heidi speaking"
                                : "Listening..."}
                        </span>
                        <span className="mt-1 text-[10px] font-medium text-slate-500">
                          {isSpeakerMuted
                            ? "Speaker off"
                            : isMicMuted
                              ? "Visitor mic off"
                              : "Noise filter enabled"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2.5 relative z-10">
                      <button
                        onClick={toggleSpeakerMute}
                        className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-2xl transition-all border",
                          isSpeakerMuted
                            ? "bg-rose-50 text-rose-500 border-rose-100"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                        )}
                        title={isSpeakerMuted ? "Unmute Heidi voice" : "Mute Heidi voice"}
                      >
                        {isSpeakerMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                      </button>
                      <button
                        onClick={toggleMicMute}
                        className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-2xl transition-all border",
                          isMicMuted
                            ? "bg-amber-50 text-amber-600 border-amber-200"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                        )}
                        title={isMicMuted ? "Unmute your microphone" : "Mute your microphone"}
                      >
                        {isMicMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                      </button>
                      <button
                        onClick={stopVoice}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-500"
                      >
                        <X className="w-4.5 h-4.5" strokeWidth={2.6} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Language Ticker */}
              <div className="w-full overflow-hidden bg-slate-50/50 py-2 rounded-2xl border border-slate-100/50">
                <div className="flex whitespace-nowrap animate-[marquee_30s_linear_infinite] gap-12 items-center px-4">
                  {[
                    { flag: "🇩🇪", text: "German" }, { flag: "🇪🇸", text: "Spanish" }, { flag: "🇫🇷", text: "French" },
                    { flag: "🇮🇹", text: "Italian" }, { flag: "🇺🇸", text: "English" }, { flag: "🇧🇷", text: "Portuguese" }
                  ].map((l, i) => (
                    <button
                      key={i}
                      onClick={() => switchLanguage(l.text)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-full px-2 py-1 transition-all",
                        activeLanguage === l.text
                          ? "bg-sky-50 text-sky-700"
                          : "hover:bg-white/80 text-slate-500"
                      )}
                      title={`Switch Heidi to ${l.text}`}
                    >
                      <span className="text-[12px] grayscale-[0.15]">{l.flag}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">{l.text}</span>
                    </button>
                  ))}
                  {/* Duplicate for seamless loop */}
                  {[
                    { flag: "🇩🇪", text: "German" }, { flag: "🇪🇸", text: "Spanish" }, { flag: "🇫🇷", text: "French" },
                    { flag: "🇮🇹", text: "Italian" }
                  ].map((l, i) => (
                    <button
                      key={`loop-${i}`}
                      onClick={() => switchLanguage(l.text)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-full px-2 py-1 transition-all",
                        activeLanguage === l.text
                          ? "bg-sky-50 text-sky-700"
                          : "hover:bg-white/80 text-slate-500"
                      )}
                      title={`Switch Heidi to ${l.text}`}
                    >
                      <span className="text-[12px] grayscale-[0.15]">{l.flag}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">{l.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pt-1">
                <button onClick={closeWidget} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] hover:text-slate-900 transition-colors flex items-center gap-2">
                  <X className="w-3.5 h-3.5" /> Hide
                </button>
                <button onClick={() => { setMessages([]); }} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] hover:text-red-500 transition-colors flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>
          </div>
          
          {/* Disclaimer */}
          <div className="bg-slate-50 py-3 px-8 flex justify-center border-t border-slate-100/50">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Ai can make mistakes. Relax. Chill.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
