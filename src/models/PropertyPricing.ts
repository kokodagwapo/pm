import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPricingDiscount {
  minDays: number;
  discountType: "percentage" | "fixed";
  value: number;
  label: string;
}

export interface ISeasonalRate {
  startDate: Date;
  endDate: Date;
  rate: number;
  label: string;
}

export interface IPropertyPricing extends Document {
  propertyId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  
  baseRate: number;
  rateType: "nightly" | "weekly" | "monthly";
  
  weekdayRate?: number;
  weekendRate?: number;
  
  discounts: IPricingDiscount[];
  
  seasonalRates?: ISeasonalRate[];
  
  minimumStay?: number;
  maximumStay?: number;
  
  cleaningFee?: number;
  serviceFee?: number;
  securityDeposit?: number;
  
  currency: string;
  
  isActive: boolean;
  
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PricingDiscountSchema = new Schema<IPricingDiscount>({
  minDays: {
    type: Number,
    required: true,
    min: 1,
  },
  discountType: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const SeasonalRateSchema = new Schema<ISeasonalRate>({
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const PropertyPricingSchema = new Schema<IPropertyPricing>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
    },
    
    baseRate: {
      type: Number,
      required: true,
      min: 0,
    },
    rateType: {
      type: String,
      enum: ["nightly", "weekly", "monthly"],
      default: "nightly",
      required: true,
    },
    
    weekdayRate: {
      type: Number,
      min: 0,
    },
    weekendRate: {
      type: Number,
      min: 0,
    },
    
    discounts: {
      type: [PricingDiscountSchema],
      default: [],
    },
    
    seasonalRates: {
      type: [SeasonalRateSchema],
      default: [],
    },
    
    minimumStay: {
      type: Number,
      min: 1,
      default: 1,
    },
    maximumStay: {
      type: Number,
      min: 1,
    },
    
    cleaningFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    serviceFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    securityDeposit: {
      type: Number,
      min: 0,
      default: 0,
    },
    
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PropertyPricingSchema.index({ propertyId: 1, unitId: 1 }, { unique: true });
PropertyPricingSchema.index({ propertyId: 1, isActive: 1 });
PropertyPricingSchema.index({ createdBy: 1 });

PropertyPricingSchema.virtual("effectiveWeekdayRate").get(function(this: IPropertyPricing) {
  return this.weekdayRate ?? this.baseRate;
});

PropertyPricingSchema.virtual("effectiveWeekendRate").get(function(this: IPropertyPricing) {
  return this.weekendRate ?? this.baseRate;
});

PropertyPricingSchema.methods.getApplicableDiscount = function(
  this: IPropertyPricing,
  nights: number
): IPricingDiscount | null {
  const sortedDiscounts = [...this.discounts].sort((a, b) => b.minDays - a.minDays);
  return sortedDiscounts.find(d => nights >= d.minDays) || null;
};

PropertyPricingSchema.methods.getSeasonalRate = function(
  this: IPropertyPricing,
  date: Date
): number | null {
  if (!this.seasonalRates || this.seasonalRates.length === 0) {
    return null;
  }
  
  const applicableRate = this.seasonalRates.find(sr => 
    date >= sr.startDate && date <= sr.endDate
  );
  
  return applicableRate?.rate ?? null;
};

let PropertyPricing: Model<IPropertyPricing>;

if (mongoose.models?.PropertyPricing) {
  delete mongoose.models.PropertyPricing;
}

PropertyPricing = mongoose.model<IPropertyPricing>("PropertyPricing", PropertyPricingSchema);

export default PropertyPricing;
