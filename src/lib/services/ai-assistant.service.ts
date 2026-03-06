import OpenAI from "openai";
import { AI_ASSISTANTS, AI_CONFIG, getAssistantById, AIAssistantConfig } from "@/lib/config/ai-assistants";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIContext {
  propertyName?: string;
  propertyAddress?: string;
  tenantName?: string;
  leaseEndDate?: string;
  rentAmount?: number;
  pendingMaintenanceCount?: number;
  customContext?: string;
}

export interface AIResponse {
  content: string;
  assistantId: string;
  assistantName: string;
  tokensUsed?: number;
  error?: string;
}

class AIAssistantService {
  private openai: OpenAI | null = null;

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  private buildContextPrompt(context: AIContext): string {
    const parts: string[] = [];

    if (context.propertyName || context.propertyAddress) {
      parts.push(`Property: ${context.propertyName || "Unknown"} at ${context.propertyAddress || "address on file"}`);
    }

    if (context.tenantName) {
      parts.push(`Tenant name: ${context.tenantName}`);
    }

    if (context.leaseEndDate) {
      parts.push(`Lease end date: ${context.leaseEndDate}`);
    }

    if (context.rentAmount) {
      parts.push(`Monthly rent: $${context.rentAmount.toFixed(2)}`);
    }

    if (context.pendingMaintenanceCount !== undefined) {
      parts.push(`Pending maintenance requests: ${context.pendingMaintenanceCount}`);
    }

    if (context.customContext) {
      parts.push(context.customContext);
    }

    if (parts.length === 0) {
      return "";
    }

    return `\n\nCurrent context for this conversation:\n${parts.join("\n")}`;
  }

  async chat(
    assistantId: string,
    messages: AIMessage[],
    context?: AIContext
  ): Promise<AIResponse> {
    const assistant = getAssistantById(assistantId);
    
    if (!assistant) {
      return {
        content: "I apologize, but I'm having trouble connecting right now. Please try again or contact our support team.",
        assistantId: assistantId,
        assistantName: "Assistant",
        error: "Unknown assistant ID",
      };
    }

    try {
      const openai = this.getOpenAI();

      let systemPrompt = assistant.systemPrompt;
      if (context) {
        systemPrompt += this.buildContextPrompt(context);
      }

      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: chatMessages,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
      });

      const responseContent = completion.choices[0]?.message?.content || 
        "I apologize, but I couldn't generate a response. Please try again.";

      return {
        content: responseContent,
        assistantId: assistant.id,
        assistantName: assistant.name,
        tokensUsed: completion.usage?.total_tokens,
      };
    } catch (error) {
      console.error("AI Assistant chat error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      return {
        content: "I'm having trouble connecting right now. Please try again in a moment, or contact our support team if the issue persists.",
        assistantId: assistant.id,
        assistantName: assistant.name,
        error: errorMessage,
      };
    }
  }

  async generateFAQAnswer(question: string): Promise<AIResponse> {
    const systemPrompt = `You are a helpful assistant for SmartStartPM property management. 
Answer the following frequently asked question concisely and accurately. 
If the question is outside the scope of property management, politely indicate that and suggest contacting staff.
Keep answers under 200 words.`;

    try {
      const openai = this.getOpenAI();

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 500,
        temperature: 0.5,
      });

      return {
        content: completion.choices[0]?.message?.content || "Unable to generate answer.",
        assistantId: "faq-generator",
        assistantName: "FAQ Assistant",
        tokensUsed: completion.usage?.total_tokens,
      };
    } catch (error) {
      console.error("FAQ answer generation error:", error);
      return {
        content: "Unable to generate answer at this time.",
        assistantId: "faq-generator",
        assistantName: "FAQ Assistant",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async suggestResponse(
    conversationHistory: AIMessage[],
    context?: AIContext
  ): Promise<string[]> {
    const systemPrompt = `Based on the conversation history, suggest 3 brief follow-up questions or responses the user might want to ask. 
Return only the suggestions, one per line, no numbering or bullets. Keep each under 50 characters.`;

    try {
      const openai = this.getOpenAI();

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-6).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: "Suggest follow-up questions" },
      ];

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages,
        max_tokens: 150,
        temperature: 0.8,
      });

      const response = completion.choices[0]?.message?.content || "";
      const suggestions = response
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 60)
        .slice(0, 3);

      return suggestions.length > 0 
        ? suggestions 
        : ["Tell me more", "What else should I know?", "How do I proceed?"];
    } catch (error) {
      console.error("Suggestion generation error:", error);
      return ["Tell me more", "What else should I know?", "How do I proceed?"];
    }
  }

  async analyzeIntent(message: string): Promise<{
    category: string;
    urgency: "low" | "medium" | "high" | "emergency";
    suggestedAssistant: string;
  }> {
    const systemPrompt = `Analyze the user message and categorize it. Return JSON only with:
- category: one of "maintenance", "payment", "lease", "general", "emergency", "complaint"
- urgency: one of "low", "medium", "high", "emergency"
- suggestedAssistant: "jack" for maintenance/property issues, "heidi" for payments/leasing

Examples:
"My AC is not working" -> {"category":"maintenance","urgency":"high","suggestedAssistant":"jack"}
"How do I pay rent?" -> {"category":"payment","urgency":"low","suggestedAssistant":"heidi"}
"Water is flooding my apartment" -> {"category":"emergency","urgency":"emergency","suggestedAssistant":"jack"}`;

    try {
      const openai = this.getOpenAI();

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 100,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
      
      return {
        category: result.category || "general",
        urgency: result.urgency || "low",
        suggestedAssistant: result.suggestedAssistant || "jack",
      };
    } catch (error) {
      console.error("Intent analysis error:", error);
      return {
        category: "general",
        urgency: "low",
        suggestedAssistant: "jack",
      };
    }
  }

  getAssistantConfig(assistantId: string): AIAssistantConfig | undefined {
    return getAssistantById(assistantId);
  }

  getAllAssistants(): AIAssistantConfig[] {
    return Object.values(AI_ASSISTANTS);
  }
}

export const aiAssistantService = new AIAssistantService();
export default aiAssistantService;
