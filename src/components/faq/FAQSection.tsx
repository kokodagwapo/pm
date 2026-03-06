"use client";

import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThumbsUp, ThumbsDown, Search, MessageCircle, Loader2 } from "lucide-react";

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
}

interface FAQSectionProps {
  onAskAI?: (question: string) => void;
  showAIOption?: boolean;
}

const categoryLabels: Record<string, string> = {
  general: "General",
  payments: "Payments",
  maintenance: "Maintenance",
  leasing: "Leasing",
  owner: "Property Owners",
  tenant: "Tenants",
  emergency: "Emergency",
  policies: "Policies",
};

const categoryColors: Record<string, string> = {
  general: "bg-gray-100 text-gray-800",
  payments: "bg-green-100 text-green-800",
  maintenance: "bg-orange-100 text-orange-800",
  leasing: "bg-blue-100 text-blue-800",
  owner: "bg-purple-100 text-purple-800",
  tenant: "bg-cyan-100 text-cyan-800",
  emergency: "bg-red-100 text-red-800",
  policies: "bg-yellow-100 text-yellow-800",
};

export default function FAQSection({ onAskAI, showAIOption = true }: FAQSectionProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "helpful" | "not_helpful">>({});

  useEffect(() => {
    fetchFAQs();
  }, [activeCategory, searchQuery]);

  const fetchFAQs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "all") {
        params.set("category", activeCategory);
      }
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const response = await fetch(`/api/faq?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setFaqs(data.data.faqs || []);
        setCategories(data.data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (faqId: string, action: "helpful" | "not_helpful") => {
    if (feedbackGiven[faqId]) return;

    try {
      const response = await fetch(`/api/faq/${faqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        setFeedbackGiven((prev) => ({ ...prev, [faqId]: action }));
        setFaqs((prev) =>
          prev.map((faq) =>
            faq._id === faqId
              ? {
                  ...faq,
                  helpfulCount: action === "helpful" ? faq.helpfulCount + 1 : faq.helpfulCount,
                  notHelpfulCount: action === "not_helpful" ? faq.notHelpfulCount + 1 : faq.notHelpfulCount,
                }
              : faq
          )
        );
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  const filteredFaqs = faqs;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Frequently Asked Questions</span>
          {showAIOption && onAskAI && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAskAI(searchQuery || "I have a question")}
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Ask AI
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  {categoryLabels[category] || category}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeCategory} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredFaqs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No FAQs found.</p>
                  {showAIOption && onAskAI && (
                    <Button
                      variant="link"
                      onClick={() => onAskAI(searchQuery || "I have a question")}
                      className="mt-2"
                    >
                      Ask our AI assistant instead
                    </Button>
                  )}
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq) => (
                    <AccordionItem key={faq._id} value={faq._id}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-start gap-2">
                          <Badge
                            variant="secondary"
                            className={`${categoryColors[faq.category] || "bg-gray-100"} text-xs shrink-0`}
                          >
                            {categoryLabels[faq.category] || faq.category}
                          </Badge>
                          <span>{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {faq.answer}
                          </p>
                          
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              Was this helpful?
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFeedback(faq._id, "helpful")}
                                disabled={!!feedbackGiven[faq._id]}
                                className={`gap-1 ${
                                  feedbackGiven[faq._id] === "helpful"
                                    ? "text-green-600"
                                    : ""
                                }`}
                              >
                                <ThumbsUp className="h-4 w-4" />
                                {faq.helpfulCount}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFeedback(faq._id, "not_helpful")}
                                disabled={!!feedbackGiven[faq._id]}
                                className={`gap-1 ${
                                  feedbackGiven[faq._id] === "not_helpful"
                                    ? "text-red-600"
                                    : ""
                                }`}
                              >
                                <ThumbsDown className="h-4 w-4" />
                                {faq.notHelpfulCount}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
