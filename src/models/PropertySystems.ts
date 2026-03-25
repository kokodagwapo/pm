/**
 * PropertySystems — tracks the age and last-serviced date of major building systems
 * per property, used for CapEx planning.
 */

import mongoose, { Schema, Model } from "mongoose";

export type SystemType =
  | "Roof"
  | "HVAC"
  | "Electrical"
  | "Plumbing"
  | "Water Heater"
  | "Foundation"
  | "Windows"
  | "Exterior"
  | "Flooring"
  | "Appliances"
  | "Elevators"
  | "Other";

export interface IPropertySystem {
  systemType: SystemType;
  installYear?: number;
  lastServicedYear?: number;
  lastReplacedYear?: number;
  estimatedLifespanYears: number;
  notes?: string;
}

export interface IPropertySystems {
  _id: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  marketRent?: number;
  systems: IPropertySystem[];
  createdAt: Date;
  updatedAt: Date;
}

const PropertySystemSchema = new Schema<IPropertySystem>(
  {
    systemType: {
      type: String,
      required: true,
      enum: [
        "Roof", "HVAC", "Electrical", "Plumbing", "Water Heater",
        "Foundation", "Windows", "Exterior", "Flooring", "Appliances",
        "Elevators", "Other",
      ],
    },
    installYear: { type: Number, min: 1900, max: 2100 },
    lastServicedYear: { type: Number, min: 1900, max: 2100 },
    lastReplacedYear: { type: Number, min: 1900, max: 2100 },
    estimatedLifespanYears: { type: Number, default: 20, min: 1, max: 100 },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const PropertySystemsSchema = new Schema<IPropertySystems>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      unique: true,
      index: true,
    },
    marketRent: { type: Number, min: 0 },
    systems: { type: [PropertySystemSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { delete ret.__v; return ret; } },
  }
);

let PropertySystems: Model<IPropertySystems>;

if (mongoose.models.PropertySystems) {
  PropertySystems = mongoose.model<IPropertySystems>("PropertySystems");
} else {
  PropertySystems = mongoose.model<IPropertySystems>("PropertySystems", PropertySystemsSchema);
}

export default PropertySystems;
