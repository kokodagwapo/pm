import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";

interface SessionUser {
  id: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const isApproved = searchParams.get("isApproved");
    const complianceHold = searchParams.get("complianceHold");
    const search = searchParams.get("search");
    const email = searchParams.get("email");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const query: Record<string, unknown> = {};

    if (category && category !== "all") query.categories = category;
    if (isApproved !== null && isApproved !== undefined && isApproved !== "")
      query.isApproved = isApproved === "true";
    if (complianceHold !== null && complianceHold !== undefined && complianceHold !== "")
      query.complianceHold = complianceHold === "true";
    if (email) query.email = email.toLowerCase();
    if (userId) query.userId = userId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { categories: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const user = session.user as SessionUser;
    const isManager = ["admin", "super_admin", "manager"].includes(user.role);

    const PUBLIC_FIELDS =
      "name contactName categories rating totalRatings city state bio serviceRadius hourlyRate callOutFee responseTimeHours activeWorkOrders completedJobs isApproved isAvailable";
    const PRIVATE_FIELDS =
      PUBLIC_FIELDS +
      " email phone address zipCode userId licenseNumber licenseExpiryDate insuranceProvider insuranceExpiryDate backgroundCheckDate backgroundCheckStatus complianceHold complianceHoldReason lastComplianceCheck walletBalance totalEarnings pendingPayout bankAccountLast4 bankAccountVerified documents payoutRequests preferredAreas createdAt updatedAt";

    // Non-managers requesting private data must be doing a self-lookup (their own profile)
    if (!isManager) {
      delete query.complianceHold;

      if (email || userId) {
        if (email && email.toLowerCase() !== (session.user as { email?: string }).email?.toLowerCase()) {
          delete query.email;
        }
        if (userId && userId !== user.id) {
          delete query.userId;
        }
        query.$or = [
          { userId: user.id },
          { email: (session.user as { email?: string }).email?.toLowerCase() },
        ];
      }
    }

    const isSelfLookup = !isManager && !!(email || userId);

    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .select(isManager || isSelfLookup ? PRIVATE_FIELDS : PUBLIC_FIELDS)
      .sort({ rating: -1, completedJobs: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      vendors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/vendors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const allowedRoles = ["admin", "super_admin", "manager"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    const {
      name,
      contactName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      categories,
      serviceRadius,
      hourlyRate,
      callOutFee,
      notes,
      bio,
      licenseNumber,
      licenseExpiryDate,
      insuranceProvider,
      insuranceExpiryDate,
      insurancePolicyNumber,
      backgroundCheckDate,
    } = body;

    if (!name || !contactName || !email || !categories?.length) {
      return NextResponse.json(
        { error: "name, contactName, email, and categories are required" },
        { status: 400 }
      );
    }

    const existing = await Vendor.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "A vendor with this email already exists" },
        { status: 409 }
      );
    }

    const vendor = new Vendor({
      name,
      contactName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      categories,
      serviceRadius: serviceRadius || 25,
      hourlyRate,
      callOutFee,
      notes,
      bio,
      licenseNumber,
      licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : undefined,
      insuranceProvider,
      insuranceExpiryDate: insuranceExpiryDate ? new Date(insuranceExpiryDate) : undefined,
      insurancePolicyNumber,
      backgroundCheckDate: backgroundCheckDate ? new Date(backgroundCheckDate) : undefined,
      isApproved: false,
      complianceHold: false,
    });

    await vendor.save();

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vendors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
