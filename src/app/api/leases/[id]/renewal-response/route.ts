import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import Lease from "@/models/Lease";

const VALID_RESPONSES = ["accepted", "negotiating", "declined"] as const;
type RenewalResponse = (typeof VALID_RESPONSES)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { response } = await req.json();

    if (!VALID_RESPONSES.includes(response as RenewalResponse)) {
      return NextResponse.json(
        { error: "Invalid response. Must be one of: accepted, negotiating, declined" },
        { status: 400 }
      );
    }

    await connectDB();

    const lease = await Lease.findById(params.id).lean();
    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const tenantId = String((lease as Record<string, unknown>).tenantId);
    const userId = session.user.id || (session.user as Record<string, string>).sub;
    const userRole = session.user.role;

    const isTenant = userRole === UserRole.TENANT && tenantId === String(userId);
    const isManager = [UserRole.ADMIN, UserRole.MANAGER].includes(userRole as UserRole);

    if (!isTenant && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Lease.findByIdAndUpdate(params.id, {
      lunaRenewalResponse: response as RenewalResponse,
      lunaRenewalRespondedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      leaseId: params.id,
      response,
      message: "Renewal response recorded. Luna will process it in the next evaluation cycle.",
    });
  } catch (error) {
    console.error("[Lease Renewal Response] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const lease = await Lease.findById(params.id)
      .select("lunaRenewalResponse lunaRenewalRespondedAt tenantId")
      .lean();
    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const tenantId = String((lease as Record<string, unknown>).tenantId);
    const userId = session.user.id || (session.user as Record<string, string>).sub;
    const userRole = session.user.role;

    const isTenant = userRole === UserRole.TENANT && tenantId === String(userId);
    const isManager = [UserRole.ADMIN, UserRole.MANAGER].includes(userRole as UserRole);

    if (!isTenant && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      leaseId: params.id,
      renewalResponse: (lease as Record<string, unknown>).lunaRenewalResponse ?? null,
      respondedAt: (lease as Record<string, unknown>).lunaRenewalRespondedAt ?? null,
    });
  } catch (error) {
    console.error("[Lease Renewal Response GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
