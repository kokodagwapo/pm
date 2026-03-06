"use client";

import { useRouter } from "next/navigation";
import FAQSection from "@/components/faq/FAQSection";

export default function FAQPage() {
  const router = useRouter();

  const handleAskAI = (question: string) => {
    router.push(`/dashboard/ai-help?question=${encodeURIComponent(question)}`);
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mt-1">
          Find answers to common questions or chat with our AI assistants
        </p>
      </div>
      <FAQSection onAskAI={handleAskAI} showAIOption />
    </div>
  );
}
