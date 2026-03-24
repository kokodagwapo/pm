import mongoose, { Schema, Model } from "mongoose";
import type { Types } from "mongoose";

export const RENEWAL_OPPORTUNITY_STATUSES = [
  "renewal_candidate",
  "contacted",
  "interested",
  "pending",
  "not_renewing",
] as const;

export type RenewalOpportunityStatus = (typeof RENEWAL_OPPORTUNITY_STATUSES)[number];

export interface IRenewalOpportunity {
  leaseId: Types.ObjectId;
  tenantId: Types.ObjectId;
  propertyId: Types.ObjectId;
  unitId?: Types.ObjectId;
  status: RenewalOpportunityStatus;
  notes?: string;
  nextContactAt?: Date;
  lastContactAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RenewalOpportunitySchema = new Schema<IRenewalOpportunity>(
  {
    leaseId: {
      type: Schema.Types.ObjectId,
      ref: "Lease",
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    unitId: { type: Schema.Types.ObjectId },
    status: {
      type: String,
      enum: RENEWAL_OPPORTUNITY_STATUSES,
      default: "renewal_candidate",
      index: true,
    },
    notes: { type: String, maxlength: 8000, trim: true },
    nextContactAt: { type: Date },
    lastContactAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RenewalOpportunitySchema.index({ propertyId: 1, status: 1 });
RenewalOpportunitySchema.index({ status: 1, nextContactAt: 1 });

let RenewalOpportunity: Model<IRenewalOpportunity>;

if (mongoose.models.RenewalOpportunity) {
  RenewalOpportunity = mongoose.model<IRenewalOpportunity>("RenewalOpportunity");
} else {
  RenewalOpportunity = mongoose.model<IRenewalOpportunity>(
    "RenewalOpportunity",
    RenewalOpportunitySchema
  );
}

export default RenewalOpportunity;
