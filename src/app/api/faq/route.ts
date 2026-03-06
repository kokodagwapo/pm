/**
 * SmartStartPM - FAQ API
 * CRUD operations for frequently asked questions
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
  parsePaginationParams,
} from "@/lib/api-utils";
import { z } from "zod";

const createFAQSchema = z.object({
  question: z.string().min(1, "Question is required").max(500),
  answer: z.string().min(1, "Answer is required").max(5000),
  category: z.enum(["general", "payments", "maintenance", "leasing", "owner", "tenant", "emergency", "policies"]),
  keywords: z.array(z.string()).max(20).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().optional(),
  relatedFAQs: z.array(z.string()).optional(),
});

const updateFAQSchema = createFAQSchema.partial();

// GET /api/faq - Get FAQs with filtering
export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const popular = searchParams.get("popular") === "true";
    const publishedOnly = user.role !== UserRole.ADMIN;

    let query: any = {};
    
    if (publishedOnly) {
      query.isPublished = true;
    }
    
    if (category) {
      query.category = category;
    }

    let faqs;
    let total;

    if (search) {
      faqs = await FAQ.find(
        {
          $text: { $search: search },
          ...query,
        },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      
      total = await FAQ.countDocuments({
        $text: { $search: search },
        ...query,
      });
    } else if (popular) {
      faqs = await FAQ.find(query)
        .sort({ viewCount: -1, helpfulCount: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      
      total = await FAQ.countDocuments(query);
    } else {
      faqs = await FAQ.find(query)
        .sort({ category: 1, sortOrder: 1, helpfulCount: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      
      total = await FAQ.countDocuments(query);
    }

    const categories = await FAQ.distinct("category", publishedOnly ? { isPublished: true } : {});

    return createSuccessResponse({
      faqs,
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, "FAQs retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
});

// POST /api/faq - Create new FAQ (Admin only)
export const POST = withRoleAndDB([UserRole.ADMIN])(
  async (user, request: NextRequest) => {
    try {
      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

      const validation = createFAQSchema.safeParse(body);
      if (!validation.success) {
        return createErrorResponse(
          `Validation failed: ${validation.error.errors.map((e) => e.message).join(", ")}`,
          400
        );
      }

      const faqData = {
        ...validation.data,
        createdBy: user.id,
      };

      const faq = await FAQ.create(faqData);

      return createSuccessResponse(faq, "FAQ created successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
);
