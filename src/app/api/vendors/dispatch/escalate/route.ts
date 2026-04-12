export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import VendorJob from "@/models/VendorJob";
import mongoose from "mongoose";
import { haversineKm, vendorScore } from "@/lib/vendor-dispatch";

const DISPATCH_TIMEOUT_MINUTES = 15;

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (!["admin", "super_admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const now = new Date();

    const timedOutJobs = await VendorJob.find({
      status: "dispatched",
    }).lean();

    const escalated: string[] = [];
    const noMore: string[] = [];

    for (const job of timedOutJobs) {
      if (!job.dispatchLog || job.dispatchLog.length === 0) continue;

      const lastEntry = job.dispatchLog[job.dispatchLog.length - 1];
      if (lastEntry.response) continue;
      if (!lastEntry.expiresAt || lastEntry.expiresAt > now) continue;

      const alreadyContacted = job.dispatchLog.map((d) => d.vendorId.toString());

      // Resolve stored property coordinates for distance-aware escalation
      const storedCoords = (job as unknown as { propertyCoordinates?: { lat: number; lng: number } }).propertyCoordinates;
      const propLat = storedCoords?.lat ?? null;
      const propLng = storedCoords?.lng ?? null;

      const geoQuery: Record<string, unknown> = {
        categories: job.category,
        isApproved: true,
        isAvailable: true,
        complianceHold: false,
        _id: { $nin: alreadyContacted.map((id) => new mongoose.Types.ObjectId(id)) },
      };

      // Add geo filter when property coordinates are known
      if (propLat !== null && propLng !== null) {
        geoQuery.location = {
          $geoWithin: {
            $centerSphere: [[propLng, propLat], 500 / 6371],
          },
        };
      }

      const candidates = await Vendor.find(geoQuery).lean();

      // Apply service-radius filter and score, matching main dispatch logic
      const scored = candidates
        .map((v) => {
          let distKm: number | null = null;
          const loc = (v as { location?: { coordinates?: number[] } }).location;
          if (propLat !== null && propLng !== null && loc?.coordinates?.length === 2) {
            const [vLng, vLat] = loc.coordinates;
            const raw = haversineKm(propLat, propLng, vLat, vLng);
            const radiusKm = ((v as { serviceRadius?: number }).serviceRadius ?? 40) * 1.609;
            if (raw > radiusKm) return null;
            distKm = raw;
          }
          return { vendor: v, score: vendorScore(v as { rating?: number; responseTimeHours?: number }, distKm) };
        })
        .filter(Boolean) as { vendor: (typeof candidates)[0]; score: number }[];

      scored.sort((a, b) => b.score - a.score);
      const nextVendor = scored[0]?.vendor ?? null;

      await VendorJob.findByIdAndUpdate(job._id, {
        $set: {
          [`dispatchLog.${job.dispatchLog.length - 1}.response`]: "timeout",
          [`dispatchLog.${job.dispatchLog.length - 1}.respondedAt`]: now,
        },
      });

      if (!nextVendor) {
        await VendorJob.findByIdAndUpdate(job._id, {
          status: "open",
          assignedVendorId: undefined,
          assignedVendorName: undefined,
        });
        if (job.assignedVendorId) {
          await Vendor.findByIdAndUpdate(job.assignedVendorId, {
            $inc: { activeWorkOrders: -1 },
          });
        }
        noMore.push(job._id.toString());
        continue;
      }

      const expiresAt = new Date(
        now.getTime() + DISPATCH_TIMEOUT_MINUTES * 60 * 1000
      );

      const vendorId = nextVendor._id as unknown as mongoose.Types.ObjectId;

      await VendorJob.findByIdAndUpdate(job._id, {
        status: "dispatched",
        assignedVendorId: vendorId,
        assignedVendorName: nextVendor.name,
        $push: {
          dispatchLog: {
            vendorId,
            vendorName: nextVendor.name,
            dispatchedAt: now,
            expiresAt,
          },
        },
      });

      if (job.assignedVendorId && job.assignedVendorId.toString() !== vendorId.toString()) {
        await Vendor.findByIdAndUpdate(job.assignedVendorId, {
          $inc: { activeWorkOrders: -1 },
        });
      }

      await Vendor.findByIdAndUpdate(vendorId, {
        $inc: { activeWorkOrders: 1 },
      });

      escalated.push(job._id.toString());
    }

    return NextResponse.json({
      processed: timedOutJobs.length,
      escalated: escalated.length,
      noVendorsAvailable: noMore.length,
      escalatedJobIds: escalated,
      reopenedJobIds: noMore,
    });
  } catch (error) {
    console.error("GET /api/vendors/dispatch/escalate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
