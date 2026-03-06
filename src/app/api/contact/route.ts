/**
 * SmartStartPM - Public Contact Form API
 * Stores contact submissions, no auth required
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
} from "@/lib/api-utils";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().max(20).optional(),
  message: z.string().min(1, "Message is required").max(2000),
  propertyInterest: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { success, data: body, error } = await parseRequestBody(request);
    if (!success) {
      return createErrorResponse(error!, 400);
    }

    const validation = contactSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        validation.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const submission = {
      ...validation.data,
      createdAt: new Date(),
      source: "landing",
    };

    const db = mongoose.connection.db;
    if (db) {
      await db.collection("contact_submissions").insertOne(submission);
    }

    return createSuccessResponse(
      { id: submission.createdAt },
      "Thank you for your message. We'll be in touch soon."
    );
  } catch (error) {
    return handleApiError(error);
  }
}
