import { NextRequest, NextResponse } from "next/server";
import { FAQ } from "@/models";
import { connectDBSafe } from "@/lib/mongodb";
import { createSuccessResponse, handleApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDBSafe();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    if (!search) {
      return NextResponse.json({ error: "search is required" }, { status: 400 });
    }

    const query: Record<string, unknown> = {
      isPublished: true,
      $text: { $search: search },
    };

    if (category) {
      query.category = category;
    }

    const faqs = await FAQ.find(query, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" }, helpfulCount: -1 })
      .limit(6)
      .lean();

    return createSuccessResponse({ faqs }, "FAQ search results retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}
