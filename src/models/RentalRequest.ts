import mongoose, { Schema, Model } from "mongoose";
import {
  IRentalRequest,
  RentalRequestStatus,
} from "@/types";

const DiscountAppliedSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "early_bird",
        "long_term_weekly",
        "long_term_monthly",
        "seasonal",
        "last_minute",
        "custom",
      ],
    },
    label: { type: String, required: true },
    percentage: { type: Number },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const RentalRequestSchema = new Schema<IRentalRequest>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      required: [true, "Unit ID is required"],
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Tenant ID is required"],
      index: true,
    },
    requestedStartDate: {
      type: Date,
      required: [true, "Requested start date is required"],
    },
    requestedEndDate: {
      type: Date,
      required: [true, "Requested end date is required"],
    },
    status: {
      type: String,
      enum: Object.values(RentalRequestStatus),
      default: RentalRequestStatus.PENDING,
      index: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: [0, "Base price cannot be negative"],
    },
    calculatedPrice: {
      type: Number,
      required: true,
      min: [0, "Calculated price cannot be negative"],
    },
    totalNights: {
      type: Number,
      required: true,
      min: [1, "Total nights must be at least 1"],
    },
    discountsApplied: [DiscountAppliedSchema],
    priceBreakdown: {
      type: Schema.Types.Mixed,
    },
    tenantMessage: {
      type: String,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: [1000, "Response cannot exceed 1000 characters"],
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    respondedAt: { type: Date },
    approvedLeaseId: {
      type: Schema.Types.ObjectId,
      ref: "Lease",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

RentalRequestSchema.index({ tenantId: 1, status: 1 });
RentalRequestSchema.index({ propertyId: 1, unitId: 1, status: 1 });
RentalRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

RentalRequestSchema.pre("validate", function (next) {
  if (this.requestedStartDate && this.requestedEndDate) {
    if (this.requestedStartDate >= this.requestedEndDate) {
      return next(new Error("End date must be after start date"));
    }

    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    if (this.requestedEndDate > twoYearsFromNow) {
      return next(new Error("Cannot request rentals more than 2 years in advance"));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (this.requestedStartDate < today) {
      return next(new Error("Start date cannot be in the past"));
    }
  }

  if (!this.expiresAt && this.isNew) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  next();
});

const RentalRequest: Model<IRentalRequest> =
  mongoose.models.RentalRequest ||
  mongoose.model<IRentalRequest>("RentalRequest", RentalRequestSchema);

export default RentalRequest;
