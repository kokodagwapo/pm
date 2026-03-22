export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import DemoLeadSubmission from "@/models/DemoLeadSubmission";
import { UserRole } from "@/types";
import {
  createSuccessResponse,
  handleApiError,
  withRoleAndDB,
  parsePaginationParams,
  createPaginationInfo,
} from "@/lib/api-utils";

export const GET = withRoleAndDB([UserRole.ADMIN])(
  async (_user, request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const { page, limit } = parsePaginationParams(searchParams);
      const skip = (page - 1) * limit;

      const [total, items] = await Promise.all([
        DemoLeadSubmission.countDocuments(),
        DemoLeadSubmission.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      const data = items.map((row) => ({
        id: row._id.toString(),
        fullName: row.fullName,
        phone: row.phone,
        email: row.email,
        createdAt: row.createdAt?.toISOString?.() ?? null,
      }));

      return createSuccessResponse(
        { items: data },
        undefined,
        createPaginationInfo(page, limit, total)
      );
    } catch (error) {
      return handleApiError(error);
    }
  }
);
