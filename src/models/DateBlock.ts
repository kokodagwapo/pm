import mongoose, { Schema, Model } from "mongoose";
import {
  IDateBlock,
  DateBlockType,
} from "@/types";

const DateBlockSchema = new Schema<IDateBlock>(
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
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    blockType: {
      type: String,
      enum: Object.values(DateBlockType),
      required: [true, "Block type is required"],
      default: DateBlockType.HOLD,
    },
    isHardBlock: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Blocked by user is required"],
    },
    blockedByRole: {
      type: String,
      enum: ["admin", "manager", "owner"],
      required: true,
    },
    recurring: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["yearly"],
        default: "yearly",
      },
      endRecurrence: { type: Date },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

DateBlockSchema.index({ propertyId: 1, unitId: 1, startDate: 1, endDate: 1 });
DateBlockSchema.index({ propertyId: 1, startDate: 1, endDate: 1 });
DateBlockSchema.index({ blockedBy: 1 });
DateBlockSchema.index({ isActive: 1, endDate: 1 });

DateBlockSchema.pre("validate", function (next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error("End date must be after start date"));
  }

  const twoYearsFromNow = new Date();
  twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
  if (this.endDate && this.endDate > twoYearsFromNow) {
    return next(new Error("Cannot block dates more than 2 years in advance"));
  }

  next();
});

const DateBlock: Model<IDateBlock> =
  mongoose.models.DateBlock || mongoose.model<IDateBlock>("DateBlock", DateBlockSchema);

export default DateBlock;
