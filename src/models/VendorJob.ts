import mongoose, { Schema, Model } from "mongoose";

export type VendorJobStatus =
  | "open"
  | "dispatched"
  | "accepted"
  | "declined"
  | "en_route"
  | "on_site"
  | "work_started"
  | "completed"
  | "approved"
  | "revision_requested"
  | "payment_released"
  | "cancelled";

export type VendorJobPriority = "low" | "medium" | "high" | "emergency";

export interface IVendorBid {
  vendorId: mongoose.Types.ObjectId;
  vendorName: string;
  amount: number;
  estimatedHours?: number;
  notes?: string;
  submittedAt: Date;
  status: "pending" | "accepted" | "rejected";
}

export interface IDispatchLog {
  vendorId: mongoose.Types.ObjectId;
  vendorName: string;
  dispatchedAt: Date;
  expiresAt?: Date;
  response?: "accepted" | "declined" | "timeout";
  respondedAt?: Date;
}

export interface IVendorJob {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: VendorJobPriority;
  status: VendorJobStatus;
  propertyId: mongoose.Types.ObjectId;
  propertyAddress?: string;
  propertyCoordinates?: { lat: number; lng: number };
  maintenanceRequestId?: mongoose.Types.ObjectId;
  postedBy: mongoose.Types.ObjectId;
  assignedVendorId?: mongoose.Types.ObjectId;
  assignedVendorName?: string;
  budget?: number;
  finalCost?: number;
  scheduledDate?: Date;
  completedDate?: Date;
  approvedDate?: Date;
  paymentReleasedDate?: Date;
  isInstantDispatch: boolean;
  bids: IVendorBid[];
  dispatchLog: IDispatchLog[];
  beforePhotos: string[];
  afterPhotos: string[];
  vendorNotes?: string;
  managerNotes?: string;
  vendorRating?: number;
  vendorRatingComment?: string;
  tenantRating?: number;
  tenantRatingComment?: string;
  walletTransactionId?: string;
  isPublicToMarketplace: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VendorBidSchema = new Schema<IVendorBid>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    vendorName: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, required: true, min: 0 },
    estimatedHours: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { _id: true }
);

const DispatchLogSchema = new Schema<IDispatchLog>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    vendorName: { type: String, required: true, trim: true },
    dispatchedAt: { type: Date, required: true },
    expiresAt: { type: Date },
    response: {
      type: String,
      enum: ["accepted", "declined", "timeout"],
    },
    respondedAt: { type: Date },
  },
  { _id: false }
);

const VendorJobSchema = new Schema<IVendorJob>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
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
        "Emergency",
        "Other",
      ],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "emergency"],
      default: "medium",
    },
    status: {
      type: String,
      enum: [
        "open",
        "dispatched",
        "accepted",
        "declined",
        "en_route",
        "on_site",
        "work_started",
        "completed",
        "approved",
        "revision_requested",
        "payment_released",
        "cancelled",
      ],
      default: "open",
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    propertyAddress: { type: String, trim: true, maxlength: 300 },
    propertyCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    maintenanceRequestId: {
      type: Schema.Types.ObjectId,
      ref: "MaintenanceRequest",
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedVendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },
    assignedVendorName: { type: String, trim: true, maxlength: 200 },
    budget: { type: Number, min: 0 },
    finalCost: { type: Number, min: 0 },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    approvedDate: { type: Date },
    paymentReleasedDate: { type: Date },
    isInstantDispatch: { type: Boolean, default: false },
    bids: { type: [VendorBidSchema], default: [] },
    dispatchLog: { type: [DispatchLogSchema], default: [] },
    beforePhotos: { type: [String], default: [] },
    afterPhotos: { type: [String], default: [] },
    vendorNotes: { type: String, trim: true, maxlength: 2000 },
    managerNotes: { type: String, trim: true, maxlength: 2000 },
    vendorRating: { type: Number, min: 1, max: 5 },
    vendorRatingComment: { type: String, trim: true, maxlength: 1000 },
    tenantRating: { type: Number, min: 1, max: 5 },
    tenantRatingComment: { type: String, trim: true, maxlength: 1000 },
    walletTransactionId: { type: String, trim: true },
    isPublicToMarketplace: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

VendorJobSchema.index({ category: 1, status: 1 });
VendorJobSchema.index({ assignedVendorId: 1, status: 1 });
VendorJobSchema.index({ createdAt: -1 });
VendorJobSchema.index({ isPublicToMarketplace: 1, status: 1 });

let VendorJob: Model<IVendorJob>;

if (mongoose.models.VendorJob) {
  VendorJob = mongoose.model<IVendorJob>("VendorJob");
} else {
  VendorJob = mongoose.model<IVendorJob>("VendorJob", VendorJobSchema);
}

export default VendorJob;
