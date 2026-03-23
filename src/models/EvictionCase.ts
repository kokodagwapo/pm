import mongoose, { Schema } from "mongoose";

export interface IEvictionStep {
  stepNumber: number;
  name: string;
  description: string;
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId;
  notes?: string;
  documentsUploaded?: string[];
}

export interface IEvictionCase {
  _id: string;
  propertyId: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  unitNumber?: string;
  state: string;
  reason: string;
  steps: IEvictionStep[];
  currentStep: number;
  status: "active" | "on_hold" | "completed" | "dismissed";
  filedAt?: Date;
  courtDate?: Date;
  judgmentDate?: Date;
  resolution?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EvictionStepSchema = new Schema<IEvictionStep>(
  {
    stepNumber: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, trim: true, maxlength: 2000 },
    documentsUploaded: { type: [String], default: [] },
  },
  { _id: false }
);

const EvictionCaseSchema = new Schema<IEvictionCase>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "User" },
    unitNumber: { type: String, trim: true },
    state: { type: String, required: true, trim: true, maxlength: 50 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    steps: { type: [EvictionStepSchema], default: [] },
    currentStep: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["active", "on_hold", "completed", "dismissed"],
      default: "active",
    },
    filedAt: { type: Date },
    courtDate: { type: Date },
    judgmentDate: { type: Date },
    resolution: { type: String, trim: true, maxlength: 1000 },
    notes: { type: String, trim: true, maxlength: 5000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

EvictionCaseSchema.index({ propertyId: 1, status: 1 });
EvictionCaseSchema.index({ createdBy: 1 });

const EvictionCase =
  (mongoose.models.EvictionCase as mongoose.Model<IEvictionCase>) ||
  mongoose.model<IEvictionCase>("EvictionCase", EvictionCaseSchema);

export default EvictionCase;
