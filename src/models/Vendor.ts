import mongoose, { Schema, Model } from "mongoose";

export interface IVendor {
  _id: string;
  userId?: mongoose.Types.ObjectId;
  name: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  categories: string[];
  serviceRadius?: number;
  isApproved: boolean;
  isAvailable: boolean;
  rating: number;
  totalRatings: number;
  responseTimeHours: number;
  hourlyRate?: number;
  callOutFee?: number;
  notes?: string;
  bio?: string;
  activeWorkOrders: number;
  completedJobs: number;
  licenseNumber?: string;
  licenseExpiryDate?: Date;
  insuranceProvider?: string;
  insuranceExpiryDate?: Date;
  insurancePolicyNumber?: string;
  backgroundCheckDate?: Date;
  backgroundCheckStatus?: "pending" | "approved" | "rejected" | "expired";
  complianceHold: boolean;
  complianceHoldReason?: string;
  lastComplianceCheck?: Date;
  walletBalance: number;
  bankAccountLast4?: string;
  bankRoutingLast4?: string;
  bankAccountVerified: boolean;
  totalEarnings: number;
  pendingPayout: number;
  preferredAreas?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    contactName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true, maxlength: 300 },
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 50 },
    zipCode: { type: String, trim: true, maxlength: 10 },
    categories: {
      type: [String],
      default: [],
      enum: [
        "Plumbing",
        "Electrical",
        "HVAC",
        "Appliances",
        "Flooring",
        "Roofing",
        "Painting",
        "Landscaping",
        "Pest Control",
        "Cleaning",
        "Security",
        "General",
        "Structural",
        "Windows",
        "Doors",
      ],
    },
    serviceRadius: { type: Number, min: 0, max: 500, default: 25 },
    isApproved: { type: Boolean, default: false, index: true },
    isAvailable: { type: Boolean, default: true, index: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    totalRatings: { type: Number, default: 0, min: 0 },
    responseTimeHours: { type: Number, min: 0, default: 24 },
    hourlyRate: { type: Number, min: 0 },
    callOutFee: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
    bio: { type: String, trim: true, maxlength: 500 },
    activeWorkOrders: { type: Number, default: 0, min: 0 },
    completedJobs: { type: Number, default: 0, min: 0 },
    licenseNumber: { type: String, trim: true, maxlength: 100 },
    licenseExpiryDate: { type: Date },
    insuranceProvider: { type: String, trim: true, maxlength: 200 },
    insuranceExpiryDate: { type: Date },
    insurancePolicyNumber: { type: String, trim: true, maxlength: 100 },
    backgroundCheckDate: { type: Date },
    backgroundCheckStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },
    complianceHold: { type: Boolean, default: false, index: true },
    complianceHoldReason: { type: String, trim: true, maxlength: 500 },
    lastComplianceCheck: { type: Date },
    walletBalance: { type: Number, default: 0, min: 0 },
    bankAccountLast4: { type: String, trim: true, maxlength: 4 },
    bankRoutingLast4: { type: String, trim: true, maxlength: 4 },
    bankAccountVerified: { type: Boolean, default: false },
    totalEarnings: { type: Number, default: 0, min: 0 },
    pendingPayout: { type: Number, default: 0, min: 0 },
    preferredAreas: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

VendorSchema.virtual("complianceStatus").get(function () {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (this.complianceHold) return "hold";
  if (
    (this.licenseExpiryDate && this.licenseExpiryDate < now) ||
    (this.insuranceExpiryDate && this.insuranceExpiryDate < now)
  )
    return "expired";
  if (
    (this.licenseExpiryDate && this.licenseExpiryDate < thirtyDays) ||
    (this.insuranceExpiryDate && this.insuranceExpiryDate < thirtyDays)
  )
    return "expiring";
  return "valid";
});

VendorSchema.index({ categories: 1, isApproved: 1, isAvailable: 1 });
VendorSchema.index({ isApproved: 1, rating: -1 });
VendorSchema.index({ email: 1 }, { unique: true });

let Vendor: Model<IVendor>;

if (mongoose.models.Vendor) {
  Vendor = mongoose.model<IVendor>("Vendor");
} else {
  Vendor = mongoose.model<IVendor>("Vendor", VendorSchema);
}

export default Vendor;
