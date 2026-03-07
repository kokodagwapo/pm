/**
 * SmartStartPM - Public AI Assistant API (Guest Mode)
 * Allows unauthenticated users on the landing page to chat with Luna
 * No conversation persistence - stateless for guest users
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
} from "@/lib/api-utils";
import { aiAssistantService, AIMessage } from "@/lib/services/ai-assistant.service";
import { getAssistantById } from "@/lib/config/ai-assistants";
import connectDB from "@/lib/mongodb";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
});

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000, "Message too long"),
  assistantId: z.enum(["luna", "ai-luna", "heidi", "ai-heidi"]).default("luna"),
  customContext: z.string().max(2000).optional(),
  history: z.array(messageSchema).max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { success, data: body, error } = await parseRequestBody(request);
    if (!success) {
      return createErrorResponse(error!, 400);
    }

    const validation = chatRequestSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        `Validation failed: ${validation.error.errors.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { message, assistantId, customContext, history } = validation.data;

    const assistant = getAssistantById(assistantId);
    if (!assistant) {
      return createErrorResponse("Assistant not available", 400);
    }

    const baseContext =
      customContext ||
      "The user is a potential guest or renter browsing the SmartStartPM landing page. They are interested in Naples, Florida vacation rentals or long-term leases. Provide helpful information about our properties, booking process, and services. If they ask about specific areas like Vanderbilt Beach, Old Naples, or Pelican Bay, mention we have properties in those areas and suggest they browse our rentals page.";

    const conversationHistory: AIMessage[] = history
      ? [...(history as AIMessage[]), { role: "user", content: message }]
      : [{ role: "user", content: message }];

    const aiResponse = await aiAssistantService.chat(assistantId, conversationHistory, {
      customContext: baseContext,
    });

    return createSuccessResponse(
      {
        response: aiResponse.content,
        assistant: {
          id: assistant.id,
          name: assistant.name,
          avatar: assistant.avatar,
        },
        error: aiResponse.error,
      },
      "AI response generated successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
