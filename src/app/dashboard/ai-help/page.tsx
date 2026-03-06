"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AIAssistantChat from "@/components/messaging/AIAssistantChat";
import { PagePreloader } from "@/components/ui/preloader";

function AIHelpContent() {
  const searchParams = useSearchParams();
  const assistant = searchParams.get("assistant") as "jack" | "heidi" | null;

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">AI Help Center</h1>
        <p className="text-muted-foreground mt-1">
          Chat with our AI assistants Jack or Heidi for instant help
        </p>
      </div>
      <AIAssistantChat initialAssistant={assistant || "jack"} />
    </div>
  );
}

export default function AIHelpPage() {
  return (
    <Suspense fallback={<PagePreloader />}>
      <AIHelpContent />
    </Suspense>
  );
}
