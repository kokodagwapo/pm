export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/lib/api-utils";

interface InquiryDoc {
  _id: any;
  name?: string;
  email?: string;
  propertyName?: string;
  startDate?: string;
  endDate?: string;
  followupSentAt?: Date;
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const secret = request.headers.get("x-cron-secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return createErrorResponse("Unauthorized", 401);
    }

    await connectDB();

    const mongoose = (await import("mongoose")).default;

    const InquiryModel =
      mongoose.models.Inquiry ||
      mongoose.model(
        "Inquiry",
        new mongoose.Schema(
          {
            name: String,
            email: String,
            propertyName: String,
            startDate: String,
            endDate: String,
            followupSentAt: Date,
            createdAt: Date,
          },
          { strict: false }
        )
      );

    const cutoffOld = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const cutoffRecent = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const inquiries = (await InquiryModel.find({
      createdAt: { $gte: cutoffOld, $lte: cutoffRecent },
      followupSentAt: { $exists: false },
    })
      .limit(50)
      .lean()) as InquiryDoc[];

    const processed: string[] = [];

    for (const inquiry of inquiries) {
      try {
        await InquiryModel.findByIdAndUpdate(inquiry._id, {
          followupSentAt: new Date(),
        });
        processed.push(inquiry._id.toString());
      } catch {
        // continue
      }
    }

    return createSuccessResponse(
      {
        processed: processed.length,
        ids: processed,
        ranAt: new Date().toISOString(),
      },
      `Follow-up cron ran: ${processed.length} inquiries processed`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
