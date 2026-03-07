import mongoose, { Schema, Model } from "mongoose";
import {
  IPricingRule,
  PricingRuleType,
} from "@/types";

const AdvanceBookingDiscountSchema = new Schema(
  {
    daysAhead: {
      type: Number,
      required: true,
      min: [1, "Days ahead must be at least 1"],
    },
    discountPercent: {
      type: Number,
      required: true,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
    },
  },
  { _id: false }
);

const PricingRuleSchema = new Schema<IPricingRule>(
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
    name: {
      type: String,
      required: [true, "Rule name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    ruleType: {
      type: String,
      enum: Object.values(PricingRuleType),
      required: [true, "Rule type is required"],
    },
    startDate: { type: Date },
    endDate: { type: Date },
    pricePerNight: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
    priceModifier: {
      type: {
        type: String,
        enum: ["fixed", "percentage"],
      },
      value: {
        type: Number,
      },
    },
    daysOfWeek: {
      type: [Number],
      validate: {
        validator: function (v: number[]) {
          return v.every((d) => d >= 0 && d <= 6);
        },
        message: "Days of week must be 0-6 (Sunday-Saturday)",
      },
    },
    minimumStay: {
      type: Number,
      min: [1, "Minimum stay must be at least 1 night"],
    },
    maximumStay: {
      type: Number,
      min: [1, "Maximum stay must be at least 1 night"],
    },
    gapNightRules: {
      enabled: { type: Boolean, default: false },
      minimumGap: {
        type: Number,
        min: [1, "Minimum gap must be at least 1"],
        default: 1,
      },
      autoBlock: { type: Boolean, default: false },
    },
    turnaroundDays: {
      type: Number,
      min: [0, "Turnaround days cannot be negative"],
      default: 0,
    },
    advanceBookingDiscounts: [AdvanceBookingDiscountSchema],
    longTermDiscount: {
      weeklyPercent: {
        type: Number,
        min: [0, "Weekly discount cannot be negative"],
        max: [100, "Weekly discount cannot exceed 100%"],
      },
      monthlyPercent: {
        type: Number,
        min: [0, "Monthly discount cannot be negative"],
        max: [100, "Monthly discount cannot exceed 100%"],
      },
    },
    lastMinutePricing: {
      enabled: { type: Boolean, default: false },
      daysBeforeCheckIn: {
        type: Number,
        min: [1, "Must be at least 1 day before check-in"],
      },
      modifier: {
        type: {
          type: String,
          enum: ["fixed", "percentage"],
        },
        value: { type: Number },
      },
    },
    priority: {
      type: Number,
      default: 0,
      min: [0, "Priority cannot be negative"],
      max: [100, "Priority cannot exceed 100"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
  }
);

PricingRuleSchema.index({ propertyId: 1, unitId: 1, ruleType: 1 });
PricingRuleSchema.index({ propertyId: 1, unitId: 1, startDate: 1, endDate: 1 });
PricingRuleSchema.index({ isActive: 1, ruleType: 1 });

PricingRuleSchema.pre("validate", function (next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error("End date must be after start date"));
  }

  if (this.minimumStay && this.maximumStay && this.minimumStay > this.maximumStay) {
    return next(new Error("Minimum stay cannot exceed maximum stay"));
  }

  const needsDates: string[] = [
    PricingRuleType.DAILY_OVERRIDE,
    PricingRuleType.SEASONAL,
    PricingRuleType.HOLIDAY,
  ];
  if (needsDates.includes(this.ruleType) && (!this.startDate || !this.endDate)) {
    return next(new Error(`${this.ruleType} rules require start and end dates`));
  }

  const needsDaysOfWeek: string[] = [PricingRuleType.WEEKEND, PricingRuleType.WEEKDAY];
  if (needsDaysOfWeek.includes(this.ruleType) && (!this.daysOfWeek || this.daysOfWeek.length === 0)) {
    return next(new Error(`${this.ruleType} rules require days of week`));
  }

  next();
});

const PricingRule: Model<IPricingRule> =
  mongoose.models.PricingRule || mongoose.model<IPricingRule>("PricingRule", PricingRuleSchema);

export default PricingRule;
