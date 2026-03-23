import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ComplianceObligation from "@/models/ComplianceObligation";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const obligation = await ComplianceObligation.findById(params.id)
      .populate("propertyId", "name address")
      .populate("assignedTo", "firstName lastName email")
      .populate("jurisdictionRuleId")
      .lean();

    if (!obligation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ obligation });
  } catch (error) {
    console.error("Error fetching compliance obligation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["admin", "super_admin", "manager"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const data = await request.json();

    if (data.status === "completed" && !data.completedDate) {
      data.completedDate = new Date();
    }

    const obligation = await ComplianceObligation.findByIdAndUpdate(
      params.id,
      { $set: data },
      { new: true }
    )
      .populate("propertyId", "name address")
      .populate("assignedTo", "firstName lastName email")
      .lean();

    if (!obligation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ obligation });
  } catch (error) {
    console.error("Error updating compliance obligation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["admin", "super_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    await ComplianceObligation.findByIdAndUpdate(params.id, { isActive: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting compliance obligation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
