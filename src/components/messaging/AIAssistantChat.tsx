"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Loader2,
  Bot,
  User,
  HelpCircle,
  RefreshCw,
  X,
} from "lucide-react";
import FAQSection from "@/components/faq/FAQSection";

interface AIAssistant {
  id: string;
  name: string;
  avatar: string;
  greeting: string;
  suggestedQuestions: string[];
  specialties: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  assistantName?: string;
}

interface AIAssistantChatProps {
  initialAssistant?: "luna" | "jack" | "heidi";
  propertyId?: string;
  conversationId?: string;
  onClose?: () => void;
  embedded?: boolean;
}

export default function AIAssistantChat({
  initialAssistant = "luna",
  propertyId,
  conversationId,
  onClose,
  embedded = false,
}: AIAssistantChatProps) {
  const [assistants, setAssistants] = useState<AIAssistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<AIAssistant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showFAQ, setShowFAQ] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssistants();
  }, []);

  useEffect(() => {
    if (assistants.length > 0 && !selectedAssistant) {
      const assistant = assistants.find(
        (a) => a.id === `ai-${initialAssistant}` || a.id === initialAssistant
      );
      if (assistant) {
        selectAssistant(assistant);
      }
    }
  }, [assistants, initialAssistant]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchAssistants = async () => {
    try {
      const response = await fetch("/api/conversations/ai-assist");
      const data = await response.json();
      if (data.success) {
        setAssistants(data.data.assistants);
      }
    } catch (error) {
      console.error("Error fetching assistants:", error);
    }
  };

  const selectAssistant = (assistant: AIAssistant) => {
    setSelectedAssistant(assistant);
    setSuggestions(assistant.suggestedQuestions);
    
    setMessages([
      {
        id: "greeting",
        role: "assistant",
        content: assistant.greeting,
        timestamp: new Date(),
        assistantName: assistant.name,
      },
    ]);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !selectedAssistant || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setSuggestions([]);

    try {
      const response = await fetch("/api/conversations/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistantId: selectedAssistant.id,
          message: content.trim(),
          conversationId,
          propertyId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.data.response,
          timestamp: new Date(),
          assistantName: selectedAssistant.name,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setSuggestions(data.data.suggestions || []);
      } else {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "I apologize, but I encountered an issue. Please try again.",
          timestamp: new Date(),
          assistantName: selectedAssistant.name,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I'm having trouble connecting. Please try again in a moment.",
        timestamp: new Date(),
        assistantName: selectedAssistant.name,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const switchAssistant = () => {
    if (!selectedAssistant || assistants.length < 2) return;
    
    const otherAssistant = assistants.find((a) => a.id !== selectedAssistant.id);
    if (otherAssistant) {
      selectAssistant(otherAssistant);
    }
  };

  const handleAskAI = (question: string) => {
    setShowFAQ(false);
    if (question) {
      setInputValue(question);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  if (showFAQ) {
    return (
      <Card className={embedded ? "border-0 shadow-none" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Help Center</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowFAQ(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FAQSection onAskAI={handleAskAI} showAIOption={true} />
        </CardContent>
      </Card>
    );
  }

  if (!selectedAssistant) {
    return (
      <Card className={embedded ? "border-0 shadow-none" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Choose Your Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {assistants.map((assistant) => (
              <Button
                key={assistant.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => selectAssistant(assistant)}
              >
                <Avatar className="h-16 w-16">
                  <AvatarImage src={assistant.avatar} alt={assistant.name} />
                  <AvatarFallback>{assistant.name[0]}</AvatarFallback>
                </Avatar>
                <span className="font-semibold">{assistant.name}</span>
                <div className="flex flex-wrap gap-1 justify-center">
                  {assistant.specialties.slice(0, 3).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={embedded ? "border-0 shadow-none h-full flex flex-col" : "h-[600px] flex flex-col"}>
      <CardHeader className="pb-2 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={selectedAssistant.avatar} alt={selectedAssistant.name} />
              <AvatarFallback>{selectedAssistant.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{selectedAssistant.name}</CardTitle>
              <p className="text-xs text-muted-foreground">AI Assistant</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowFAQ(true)} title="Browse FAQs">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={switchAssistant} title="Switch assistant">
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  {message.role === "assistant" ? (
                    <>
                      <AvatarImage src={selectedAssistant.avatar} alt={selectedAssistant.name} />
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedAssistant.avatar} alt={selectedAssistant.name} />
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {suggestions.length > 0 && !isLoading && (
          <div className="px-4 py-2 border-t">
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 border-t shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Ask ${selectedAssistant.name} anything...`}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!inputValue.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
