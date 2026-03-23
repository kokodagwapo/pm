import mongoose, { Schema, Model } from "mongoose";

export interface IVendor {
  _id: string;
  name: string;
  contactName: string;
  email: string;
  phone?: string;
  categories: string[];
  isApproved: boolean;
  rating: number;
  responseTimeHours: number;
  hourlyRate?: number;
  callOutFee?: number;
  notes?: string;
  activeWorkOrders: number;
  completedJobs: number;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    contactName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
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
    isApproved: { type: Boolean, default: false },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    responseTimeHours: { type: Number, min: 0, default: 24 },
    hourlyRate: { type: Number, min: 0 },
    callOutFee: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
    activeWorkOrders: { type: Number, default: 0, min: 0 },
    completedJobs: { type: Number, default: 0, min: 0 },
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

VendorSchema.index({ categories: 1, isApproved: 1 });
VendorSchema.index({ isApproved: 1, rating: -1 });
VendorSchema.index({ email: 1 }, { unique: true });

let Vendor: Model<IVendor>;

if (mongoose.models.Vendor) {
  Vendor = mongoose.model<IVendor>("Vendor");
} else {
  Vendor = mongoose.model<IVendor>("Vendor", VendorSchema);
}

export default Vendor;
