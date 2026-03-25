import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import mongoose from "mongoose";

interface SessionUser {
  id: string;
  role: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const managerRoles = ["admin", "super_admin", "manager"];
    if (!managerRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    const body = await request.json();
    const { propertyId, remove } = body as { propertyId: string; remove?: boolean };

    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      return NextResponse.json({ error: "Valid propertyId is required" }, { status: 400 });
    }

    await connectDB();

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const propObjectId = new mongoose.Types.ObjectId(propertyId);

    if (remove) {
      await Vendor.findByIdAndUpdate(id, {
        $pull: { preferredPropertyIds: propObjectId },
      });
      return NextResponse.json({ message: "Vendor removed from preferred list", isPreferred: false });
    } else {
      await Vendor.findByIdAndUpdate(id, {
        $addToSet: { preferredPropertyIds: propObjectId },
      });
      return NextResponse.json({ message: "Vendor marked as preferred", isPreferred: true });
    }
  } catch (error) {
    console.error("POST /api/vendors/[id]/preferred error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    await connectDB();

    const vendor = await Vendor.findById(id).select("preferredPropertyIds").lean() as { preferredPropertyIds?: mongoose.Types.ObjectId[] } | null;
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ preferredPropertyIds: vendor.preferredPropertyIds ?? [] });
  } catch (error) {
    console.error("GET /api/vendors/[id]/preferred error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
