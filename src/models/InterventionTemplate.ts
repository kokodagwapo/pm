import mongoose, { Schema, Model } from "mongoose";

export interface IInterventionTemplate {
  label: string;
  message: string;
  createdBy: mongoose.Types.ObjectId;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InterventionTemplateSchema = new Schema<IInterventionTemplate>(
  {
    label: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InterventionTemplateSchema.index({ deletedAt: 1, createdAt: -1 });

const InterventionTemplate: Model<IInterventionTemplate> =
  mongoose.models?.InterventionTemplate ||
  mongoose.model<IInterventionTemplate>("InterventionTemplate", InterventionTemplateSchema);

export default InterventionTemplate;
