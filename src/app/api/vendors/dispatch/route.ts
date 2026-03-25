import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import VendorJob from "@/models/VendorJob";
import mongoose from "mongoose";

interface SessionUser {
  id: string;
  role: string;
}

const DISPATCH_TIMEOUT_MINUTES = 15;

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function vendorScore(
  vendor: { rating: number; responseTimeHours: number; completedJobs: number },
  distanceKm: number | null
): number {
  const ratingScore = (vendor.rating / 5) * 50;
  const responseScore = Math.max(0, 25 - vendor.responseTimeHours);
  const distanceScore =
    distanceKm !== null ? Math.max(0, 25 - distanceKm / 2) : 12;
  return ratingScore + responseScore + distanceScore;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    if (!["admin", "super_admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { jobId, category, preferredVendorId, propertyCoordinates } =
      await request.json();

    if (!jobId || !category) {
      return NextResponse.json(
        { error: "jobId and category are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }

    const job = await VendorJob.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!["open", "dispatched"].includes(job.status)) {
      return NextResponse.json(
        { error: "Job is not in a dispatchable state" },
        { status: 409 }
      );
    }

    // If re-dispatching an already-dispatched job, decrement the previous vendor's work order count
    if (job.status === "dispatched" && job.assignedVendorId) {
      await Vendor.findByIdAndUpdate(job.assignedVendorId, {
        $inc: { activeWorkOrders: -1 },
      });
    }

    const alreadyContacted = job.dispatchLog.map((d) => d.vendorId.toString());

    const geoQuery: Record<string, unknown> = {
      categories: category,
      isApproved: true,
      isAvailable: true,
      complianceHold: false,
      _id: { $nin: alreadyContacted.map((id) => new mongoose.Types.ObjectId(id)) },
    };

    let propLat: number | null = null;
    let propLng: number | null = null;

    // Resolve coordinates: request body > stored job coordinates
    const storedCoords = (job as unknown as { propertyCoordinates?: { lat: number; lng: number } }).propertyCoordinates;
    if (
      Array.isArray(propertyCoordinates) &&
      propertyCoordinates.length === 2
    ) {
      [propLng, propLat] = propertyCoordinates as [number, number];
    } else if (storedCoords?.lat && storedCoords?.lng) {
      propLat = storedCoords.lat;
      propLng = storedCoords.lng;
    }

    if (propLat !== null && propLng !== null) {
      geoQuery.location = {
        $geoWithin: {
          $centerSphere: [
            [propLng, propLat],
            500 / 6371,
          ],
        },
      };
    }

    let vendorToDispatch = null;
    let chosenDistance: number | null = null;

    if (preferredVendorId && mongoose.Types.ObjectId.isValid(preferredVendorId)) {
      const preferred = await Vendor.findOne({
        _id: preferredVendorId,
        isApproved: true,
        isAvailable: true,
        complianceHold: false,
      });
      if (preferred) {
        vendorToDispatch = preferred;
        if (
          propLat !== null &&
          propLng !== null &&
          preferred.location?.coordinates?.length === 2
        ) {
          const [vLng, vLat] = preferred.location.coordinates;
          chosenDistance = haversineKm(propLat, propLng, vLat, vLng);
        }
      }
    }

    if (!vendorToDispatch) {
      const candidates = await Vendor.find(geoQuery).lean();

      if (candidates.length === 0) {
        return NextResponse.json(
          {
            error:
              "No available, verified vendors found for this category. All qualified vendors have already been contacted or none exist.",
          },
          { status: 404 }
        );
      }

      type ScoredVendor = { vendor: (typeof candidates)[0]; score: number; distance: number | null };

      const scoreCandidate = (v: (typeof candidates)[0]): ScoredVendor | null => {
        let distKm: number | null = null;
        if (
          propLat !== null &&
          propLng !== null &&
          v.location?.coordinates?.length === 2
        ) {
          const [vLng, vLat] = v.location.coordinates as [number, number];
          const distKmRaw = haversineKm(propLat, propLng, vLat, vLng);
          const radiusKm = (v.serviceRadius ?? 40) * 1.609;
          if (distKmRaw > radiusKm) return null;
          distKm = distKmRaw;
        }
        return { vendor: v, score: vendorScore(v, distKm), distance: distKm };
      };

      // Separate preferred vendors for this property and give them first right of refusal
      const jobPropertyId = (job as unknown as { propertyId?: mongoose.Types.ObjectId }).propertyId;
      const preferred: ScoredVendor[] = [];
      const regular: ScoredVendor[] = [];

      for (const v of candidates) {
        const scored = scoreCandidate(v);
        if (!scored) continue;
        const prefIds = ((v as unknown as { preferredPropertyIds?: mongoose.Types.ObjectId[] }).preferredPropertyIds ?? []);
        const isPreferredForProperty = jobPropertyId && prefIds.some((pid) => pid.toString() === jobPropertyId.toString());
        if (isPreferredForProperty) {
          preferred.push(scored);
        } else {
          regular.push(scored);
        }
      }

      const pool = preferred.length > 0 ? preferred : regular;

      if (pool.length === 0) {
        return NextResponse.json(
          { error: "No vendors available within the service area for this job location." },
          { status: 404 }
        );
      }

      pool.sort((a, b) => b.score - a.score);
      vendorToDispatch = pool[0].vendor;
      chosenDistance = pool[0].distance;
    }

    const vendorId = vendorToDispatch._id as unknown as mongoose.Types.ObjectId;
    const expiresAt = new Date(Date.now() + DISPATCH_TIMEOUT_MINUTES * 60 * 1000);

    await VendorJob.findByIdAndUpdate(jobId, {
      status: "dispatched",
      assignedVendorId: vendorId,
      assignedVendorName: vendorToDispatch.name,
      $push: {
        dispatchLog: {
          vendorId,
          vendorName: vendorToDispatch.name,
          dispatchedAt: new Date(),
          expiresAt,
        },
      },
    });

    await Vendor.findByIdAndUpdate(vendorId, {
      $inc: { activeWorkOrders: 1 },
    });

    const updatedJob = await VendorJob.findById(jobId)
      .populate("propertyId", "name address")
      .populate("assignedVendorId", "name contactName email phone rating")
      .lean();

    return NextResponse.json({
      job: updatedJob,
      dispatchedTo: {
        id: vendorToDispatch._id,
        name: vendorToDispatch.name,
        rating: vendorToDispatch.rating,
        responseTimeHours: vendorToDispatch.responseTimeHours,
        distanceKm: chosenDistance ? Math.round(chosenDistance) : null,
      },
      expiresAt,
      timeoutMinutes: DISPATCH_TIMEOUT_MINUTES,
    });
  } catch (error) {
    console.error("POST /api/vendors/dispatch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
