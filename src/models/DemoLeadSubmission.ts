import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDemoLeadSubmission extends Document {
  fullName: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const DemoLeadSubmissionSchema = new Schema<IDemoLeadSubmission>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
  },
  { timestamps: true }
);

DemoLeadSubmissionSchema.index({ createdAt: -1 });
DemoLeadSubmissionSchema.index({ email: 1 });

const DemoLeadSubmission: Model<IDemoLeadSubmission> =
  mongoose.models.DemoLeadSubmission ||
  mongoose.model<IDemoLeadSubmission>("DemoLeadSubmission", DemoLeadSubmissionSchema);

export default DemoLeadSubmission;
