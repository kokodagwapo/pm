/**
 * SmartStartPM - AI Assistant Conversation API
 * Endpoint for AI-assisted conversations with Jack and Heidi
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { UserRole } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
  parseRequestBody,
} from "@/lib/api-utils";
import { aiAssistantService, AIMessage, AIContext } from "@/lib/services/ai-assistant.service";
import { getAssistantById } from "@/lib/config/ai-assistants";
import { User, Conversation, Message, Property, Tenant, Lease } from "@/models";
import { z } from "zod";

const chatRequestSchema = z.object({
  assistantId: z.enum(["jack", "heidi", "ai-jack", "ai-heidi"]),
  message: z.string().min(1, "Message is required").max(4000, "Message too long"),
  conversationId: z.string().optional(),
  propertyId: z.string().optional(),
});

const analyzeRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(4000, "Message too long"),
});

// POST /api/conversations/ai-assist - Chat with AI assistant
export const POST = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
])(async (user, request: NextRequest) => {
  try {
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

    const { assistantId, message, conversationId, propertyId } = validation.data;

    const assistant = getAssistantById(assistantId);
    if (!assistant) {
      return createErrorResponse("Unknown assistant", 400);
    }

    let context: AIContext = {};
    let conversationHistory: AIMessage[] = [];

    if (propertyId) {
      try {
        const property = await Property.findById(propertyId).lean();
        if (property) {
          context.propertyName = (property as any).name;
          context.propertyAddress = `${(property as any).address?.street}, ${(property as any).address?.city}, ${(property as any).address?.state}`;
        }
      } catch (e) {
        console.error("Error fetching property context:", e);
      }
    }

    if (user.role === UserRole.TENANT) {
      try {
        const tenant = await Tenant.findOne({ userId: user.id }).lean();
        if (tenant) {
          const lease = await Lease.findOne({ 
            tenantId: (tenant as any)._id,
            status: "active" 
          }).lean();
          
          if (lease) {
            context.leaseEndDate = new Date((lease as any).endDate).toLocaleDateString();
            context.rentAmount = (lease as any).rentAmount;
          }
        }

        const userDoc = await User.findById(user.id).lean();
        if (userDoc) {
          context.tenantName = `${(userDoc as any).firstName} ${(userDoc as any).lastName}`;
        }
      } catch (e) {
        console.error("Error fetching tenant context:", e);
      }
    }

    if (conversationId) {
      try {
        const existingMessages = await Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        const aiSystemUserIds = await User.find({ 
          isSystemUser: true, 
          systemUserType: "ai_assistant" 
        }).select("_id").lean();
        
        const aiUserIdStrings = aiSystemUserIds.map((u: any) => u._id.toString());

        conversationHistory = existingMessages
          .reverse()
          .map((msg: any) => ({
            role: aiUserIdStrings.includes(msg.senderId?.toString()) ? "assistant" : "user",
            content: msg.content,
          })) as AIMessage[];
      } catch (e) {
        console.error("Error fetching conversation history:", e);
      }
    }

    conversationHistory.push({
      role: "user",
      content: message,
    });

    const aiResponse = await aiAssistantService.chat(
      assistantId,
      conversationHistory,
      context
    );

    let savedMessageId: string | undefined;
    let savedConversationId = conversationId;

    if (conversationId) {
      try {
        const aiUser = await User.findOne({
          email: `${assistant.id}@vmsflorida.system`,
          isSystemUser: true,
        });

        if (aiUser) {
          const userMessage = await Message.create({
            conversationId,
            senderId: user.id,
            content: message,
            messageType: "text",
            isSystemMessage: false,
          });

          const aiMessage = await Message.create({
            conversationId,
            senderId: aiUser._id,
            content: aiResponse.content,
            messageType: "text",
            isSystemMessage: true,
            metadata: {
              assistantId: assistant.id,
              assistantName: assistant.name,
              tokensUsed: aiResponse.tokensUsed,
            },
          });

          savedMessageId = aiMessage._id.toString();

          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: aiResponse.content.substring(0, 200),
            lastMessageAt: new Date(),
          });
        }
      } catch (e) {
        console.error("Error saving messages:", e);
      }
    }

    const suggestions = await aiAssistantService.suggestResponse(conversationHistory, context);

    return createSuccessResponse({
      response: aiResponse.content,
      assistant: {
        id: assistant.id,
        name: assistant.name,
        avatar: assistant.avatar,
      },
      messageId: savedMessageId,
      conversationId: savedConversationId,
      suggestions,
      tokensUsed: aiResponse.tokensUsed,
      error: aiResponse.error,
    }, "AI response generated successfully");
  } catch (error) {
    return handleApiError(error);
  }
});

// GET /api/conversations/ai-assist - Get available assistants
export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
])(async () => {
  try {
    const assistants = aiAssistantService.getAllAssistants().map((a) => ({
      id: a.id,
      name: a.name,
      gender: a.gender,
      avatar: a.avatar,
      greeting: a.greeting,
      suggestedQuestions: a.suggestedQuestions,
      specialties: a.specialties,
    }));

    return createSuccessResponse({
      assistants,
    }, "Assistants retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
});

// PATCH /api/conversations/ai-assist - Analyze message intent
export const PATCH = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
])(async (user, request: NextRequest) => {
  try {
    const { success, data: body, error } = await parseRequestBody(request);
    if (!success) {
      return createErrorResponse(error!, 400);
    }

    const validation = analyzeRequestSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        `Validation failed: ${validation.error.errors.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { message } = validation.data;

    const analysis = await aiAssistantService.analyzeIntent(message);
    const suggestedAssistant = getAssistantById(analysis.suggestedAssistant);

    return createSuccessResponse({
      category: analysis.category,
      urgency: analysis.urgency,
      suggestedAssistant: suggestedAssistant ? {
        id: suggestedAssistant.id,
        name: suggestedAssistant.name,
        avatar: suggestedAssistant.avatar,
      } : null,
    }, "Message analyzed successfully");
  } catch (error) {
    return handleApiError(error);
  }
});
