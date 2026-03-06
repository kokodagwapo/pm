/**
 * SmartStartPM - Individual FAQ API
 * Operations for specific FAQ entries
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { FAQ } from "@/models";
import { UserRole } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
  parseRequestBody,
  isValidObjectId,
} from "@/lib/api-utils";
import { z } from "zod";

const updateFAQSchema = z.object({
  question: z.string().min(1).max(500).optional(),
  answer: z.string().min(1).max(5000).optional(),
  category: z.enum(["general", "payments", "maintenance", "leasing", "owner", "tenant", "emergency", "policies"]).optional(),
  keywords: z.array(z.string()).max(20).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().optional(),
  relatedFAQs: z.array(z.string()).optional(),
});

// GET /api/faq/[id] - Get single FAQ
export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
])(
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;

      if (!isValidObjectId(id)) {
        return createErrorResponse("Invalid FAQ ID", 400);
      }

      const faq = await FAQ.findById(id)
        .populate("relatedFAQs", "question category")
        .lean();

      if (!faq) {
        return createErrorResponse("FAQ not found", 404);
      }

      if (!(faq as any).isPublished && user.role !== UserRole.ADMIN) {
        return createErrorResponse("FAQ not found", 404);
      }

      await FAQ.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

      return createSuccessResponse(faq, "FAQ retrieved successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
);

// PUT /api/faq/[id] - Update FAQ (Admin only)
export const PUT = withRoleAndDB([UserRole.ADMIN])(
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;

      if (!isValidObjectId(id)) {
        return createErrorResponse("Invalid FAQ ID", 400);
      }

      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

      const validation = updateFAQSchema.safeParse(body);
      if (!validation.success) {
        return createErrorResponse(
          `Validation failed: ${validation.error.errors.map((e) => e.message).join(", ")}`,
          400
        );
      }

      const faq = await FAQ.findByIdAndUpdate(
        id,
        {
          ...validation.data,
          updatedBy: user.id,
        },
        { new: true }
      );

      if (!faq) {
        return createErrorResponse("FAQ not found", 404);
      }

      return createSuccessResponse(faq, "FAQ updated successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
);

// DELETE /api/faq/[id] - Delete FAQ (Admin only)
export const DELETE = withRoleAndDB([UserRole.ADMIN])(
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;

      if (!isValidObjectId(id)) {
        return createErrorResponse("Invalid FAQ ID", 400);
      }

      const faq = await FAQ.findByIdAndDelete(id);

      if (!faq) {
        return createErrorResponse("FAQ not found", 404);
      }

      return createSuccessResponse({ id }, "FAQ deleted successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
);

// PATCH /api/faq/[id] - Mark FAQ as helpful/not helpful
export const PATCH = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
])(
  async (
    user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;

      if (!isValidObjectId(id)) {
        return createErrorResponse("Invalid FAQ ID", 400);
      }

      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

      const { action } = body;

      if (!["helpful", "not_helpful"].includes(action)) {
        return createErrorResponse("Invalid action. Use 'helpful' or 'not_helpful'", 400);
      }

      const updateField = action === "helpful" ? "helpfulCount" : "notHelpfulCount";
      
      const faq = await FAQ.findByIdAndUpdate(
        id,
        { $inc: { [updateField]: 1 } },
        { new: true }
      );

      if (!faq) {
        return createErrorResponse("FAQ not found", 404);
      }

      return createSuccessResponse({
        helpfulCount: faq.helpfulCount,
        notHelpfulCount: faq.notHelpfulCount,
      }, "Feedback recorded successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
);
