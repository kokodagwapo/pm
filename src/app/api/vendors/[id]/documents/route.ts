import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import mongoose from "mongoose";

const ALLOWED_DOC_TYPES = ["license", "insurance", "background_check", "w9", "other"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const isManager = ["admin", "super_admin", "manager"].includes(user.role);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    await connectDB();

    const vendor = await Vendor.findById(id)
      .select("userId documents complianceStatus lastComplianceCheck")
      .lean();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const isOwner =
      (vendor as { userId?: { toString: () => string } }).userId?.toString() === user.id;

    if (!isManager && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ documents: (vendor as { documents?: unknown }).documents || [] });
  } catch (error) {
    console.error("GET /api/vendors/[id]/documents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    await connectDB();

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const managerRoles = ["admin", "super_admin", "manager"];
    const isManager = managerRoles.includes(user.role);
    if (!isManager && vendor.userId?.toString() !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { docType, url, filename, notes } = body;

    if (!docType || !url) {
      return NextResponse.json(
        { error: "docType and url are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_DOC_TYPES.includes(docType)) {
      return NextResponse.json(
        { error: `docType must be one of: ${ALLOWED_DOC_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const doc = {
      docType,
      url,
      filename: filename || url.split("/").pop() || "document",
      uploadedAt: new Date(),
      notes,
    };

    if (!vendor.documents) vendor.documents = [];
    vendor.documents.push(doc as Parameters<typeof vendor.documents.push>[0]);

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const issues: string[] = [];
    let shouldHold = false;

    if (vendor.licenseExpiryDate) {
      if (vendor.licenseExpiryDate < now) {
        issues.push(`Contractor license expired on ${vendor.licenseExpiryDate.toLocaleDateString()}`);
        shouldHold = true;
      } else if (vendor.licenseExpiryDate < thirtyDays) {
        issues.push(`License expires soon: ${vendor.licenseExpiryDate.toLocaleDateString()}`);
      }
    }

    if (vendor.insuranceExpiryDate) {
      if (vendor.insuranceExpiryDate < now) {
        issues.push(`Insurance expired on ${vendor.insuranceExpiryDate.toLocaleDateString()}`);
        shouldHold = true;
      } else if (vendor.insuranceExpiryDate < thirtyDays) {
        issues.push(`Insurance expires soon: ${vendor.insuranceExpiryDate.toLocaleDateString()}`);
      }
    }

    if (vendor.backgroundCheckStatus === "rejected") {
      issues.push("Background check was rejected");
      shouldHold = true;
    }

    vendor.lastComplianceCheck = now;
    if (shouldHold && !vendor.complianceHold) {
      vendor.complianceHold = true;
      vendor.complianceHoldReason = issues.filter((i) => !i.includes("soon")).join("; ");
    } else if (!shouldHold && vendor.complianceHold) {
      vendor.complianceHold = false;
      vendor.complianceHoldReason = undefined;
    }

    await vendor.save();

    return NextResponse.json(
      {
        document: doc,
        complianceResult: {
          isCompliant: issues.length === 0,
          onHold: vendor.complianceHold,
          issues,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/vendors/[id]/documents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (!["admin", "super_admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    await connectDB();

    const { documentId, verified, notes } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const doc = (vendor.documents as unknown as Array<{ _id: { toString: () => string }; verifiedAt?: Date; verifiedBy?: mongoose.Types.ObjectId; notes?: string }>)?.find(
      (d) => d._id.toString() === documentId
    );

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (verified === true) {
      doc.verifiedAt = new Date();
      doc.verifiedBy = new mongoose.Types.ObjectId(user.id);
    }
    if (notes !== undefined) doc.notes = notes;

    await vendor.save();

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("PATCH /api/vendors/[id]/documents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
