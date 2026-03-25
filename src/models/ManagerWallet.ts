import mongoose, { Schema, Model } from "mongoose";

export interface IManagerWalletTransaction {
  type: "credit" | "debit";
  amount: number;
  description: string;
  referenceId?: string;
  relatedVendorId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IManagerWallet {
  _id: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
  balance: number;
  transactions: IManagerWalletTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<IManagerWalletTransaction>(
  {
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    referenceId: { type: String },
    relatedVendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const managerWalletSchema = new Schema<IManagerWallet>(
  {
    managerId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    transactions: { type: [transactionSchema], default: [] },
  },
  { timestamps: true }
);

const ManagerWallet: Model<IManagerWallet> =
  mongoose.models.ManagerWallet ||
  mongoose.model<IManagerWallet>("ManagerWallet", managerWalletSchema);

export default ManagerWallet;
