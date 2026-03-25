import mongoose from "mongoose";
import Vendor from "@/models/Vendor";
import VendorJob from "@/models/VendorJob";

const DISPATCH_TIMEOUT_MINUTES = 15;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

export function vendorScore(vendor: { rating?: number; responseTimeHours?: number }, distKm: number | null): number {
  const ratingScore = Math.min(((vendor.rating ?? 0) / 5) * 50, 50);
  const responseScore = Math.min(50 / ((vendor.responseTimeHours ?? 24) + 1), 25);
  const distanceScore = distKm === null ? 12.5 : Math.max(25 - (distKm / 20) * 25, 0);
  return ratingScore + responseScore + distanceScore;
}

export interface DispatchResult {
  success: true;
  vendorId: mongoose.Types.ObjectId;
  vendorName: string;
  distance: number | null;
}

export interface DispatchError {
  success: false;
  error: string;
}

export async function runDispatch(
  jobId: mongoose.Types.ObjectId | string,
  category: string,
  propertyCoordinates?: { lat: number; lng: number } | null,
  preferredVendorId?: string | null
): Promise<DispatchResult | DispatchError> {
  const job = await VendorJob.findById(jobId);
  if (!job) return { success: false, error: "Job not found" };

  if (!["open", "dispatched"].includes(job.status)) {
    return { success: false, error: "Job is not in a dispatchable state" };
  }

  // If re-dispatching, decrement previous vendor's work order count
  if (job.status === "dispatched" && job.assignedVendorId) {
    await Vendor.findByIdAndUpdate(job.assignedVendorId, { $inc: { activeWorkOrders: -1 } });
  }

  const alreadyContacted = job.dispatchLog.map((d: { vendorId: { toString(): string } }) => d.vendorId.toString());

  // Resolve coordinates: passed arg > stored job coordinates
  let propLat: number | null = null;
  let propLng: number | null = null;
  const storedCoords = (job as unknown as { propertyCoordinates?: { lat: number; lng: number } }).propertyCoordinates;
  if (propertyCoordinates?.lat && propertyCoordinates?.lng) {
    propLat = propertyCoordinates.lat;
    propLng = propertyCoordinates.lng;
  } else if (storedCoords?.lat && storedCoords?.lng) {
    propLat = storedCoords.lat;
    propLng = storedCoords.lng;
  }

  const geoQuery: Record<string, unknown> = {
    categories: category,
    isApproved: true,
    isAvailable: true,
    complianceHold: false,
    _id: { $nin: alreadyContacted.map((id: string) => new mongoose.Types.ObjectId(id)) },
  };

  if (propLat !== null && propLng !== null) {
    geoQuery.location = {
      $geoWithin: {
        $centerSphere: [[propLng, propLat], 500 / 6371],
      },
    };
  }

  let vendorToDispatch: Record<string, unknown> | null = null;
  let chosenDistance: number | null = null;

  // Try explicit preferred vendor first
  if (preferredVendorId && mongoose.Types.ObjectId.isValid(preferredVendorId)) {
    const preferred = await Vendor.findOne({
      _id: preferredVendorId,
      isApproved: true,
      isAvailable: true,
      complianceHold: false,
    }).lean();
    if (preferred) {
      vendorToDispatch = preferred as Record<string, unknown>;
      const loc = (preferred as { location?: { coordinates?: number[] } }).location;
      if (propLat !== null && propLng !== null && loc?.coordinates?.length === 2) {
        const [vLng, vLat] = loc.coordinates;
        chosenDistance = haversineKm(propLat, propLng, vLat, vLng);
      }
    }
  }

  if (!vendorToDispatch) {
    const candidates = await Vendor.find(geoQuery).lean();
    if (candidates.length === 0) {
      return { success: false, error: "No available, verified vendors found for this category." };
    }

    type ScoredV = { vendor: (typeof candidates)[0]; score: number; distance: number | null };

    const scoreCandidate = (v: (typeof candidates)[0]): ScoredV | null => {
      let distKm: number | null = null;
      const loc = (v as { location?: { coordinates?: number[] } }).location;
      if (propLat !== null && propLng !== null && loc?.coordinates?.length === 2) {
        const [vLng, vLat] = loc.coordinates;
        const raw = haversineKm(propLat, propLng, vLat, vLng);
        const radiusKm = ((v as { serviceRadius?: number }).serviceRadius ?? 40) * 1.609;
        if (raw > radiusKm) return null;
        distKm = raw;
      }
      return { vendor: v, score: vendorScore(v as { rating?: number; responseTimeHours?: number }, distKm), distance: distKm };
    };

    // Preferred vendors for this property get first right of refusal
    const jobPropertyId = (job as unknown as { propertyId?: mongoose.Types.ObjectId }).propertyId;
    const preferred: ScoredV[] = [];
    const regular: ScoredV[] = [];

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
      return { success: false, error: "No vendors available within the service area for this job location." };
    }

    pool.sort((a, b) => b.score - a.score);
    vendorToDispatch = pool[0].vendor as Record<string, unknown>;
    chosenDistance = pool[0].distance;
  }

  const vendorId = (vendorToDispatch._id as mongoose.Types.ObjectId);
  const vendorName = vendorToDispatch.name as string;
  const expiresAt = new Date(Date.now() + DISPATCH_TIMEOUT_MINUTES * 60 * 1000);

  await VendorJob.findByIdAndUpdate(jobId, {
    status: "dispatched",
    assignedVendorId: vendorId,
    assignedVendorName: vendorName,
    $push: {
      dispatchLog: {
        vendorId,
        vendorName,
        dispatchedAt: new Date(),
        expiresAt,
      },
    },
  });

  await Vendor.findByIdAndUpdate(vendorId, { $inc: { activeWorkOrders: 1 } });

  return { success: true, vendorId, vendorName, distance: chosenDistance };
}
