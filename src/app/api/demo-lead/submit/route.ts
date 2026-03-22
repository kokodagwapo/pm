export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import DemoLeadSubmission from "@/models/DemoLeadSubmission";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
} from "@/lib/api-utils";
import { validateDemoLeadFields } from "@/lib/demo-lead-storage";
import { sendDemoLeadNotification } from "@/lib/demo-lead-email";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const parsed = await parseRequestBody(request);
    if (!parsed.success) {
      return createErrorResponse(parsed.error!, 400);
    }

    const body = parsed.data as Record<string, unknown>;
    const fullName = typeof body.fullName === "string" ? body.fullName : "";
    const phone = typeof body.phone === "string" ? body.phone : "";
    const email = typeof body.email === "string" ? body.email : "";

    if (!validateDemoLeadFields({ fullName, phone, email })) {
      return createErrorResponse("Invalid submission", 400);
    }

    const doc = await DemoLeadSubmission.create({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
    });

    await sendDemoLeadNotification({
      fullName: doc.fullName,
      phone: doc.phone,
      email: doc.email,
    });

    return createSuccessResponse(
      { id: doc._id.toString() },
      "Demo lead saved"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
