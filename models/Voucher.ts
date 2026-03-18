import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoucher extends Document {
  code: string;
  profile: '1-day' | '7-day' | 'unlimited';
  status: 'unused' | 'used' | 'expired';
  createdBy: mongoose.Types.ObjectId;
  usedBy?: mongoose.Types.ObjectId;
  usedAt?: Date;
  expiresAt?: Date;
  hotspotUsername?: string;
  hotspotPassword?: string;
  createdAt: Date;
  updatedAt: Date;
}

const voucherSchema = new Schema<IVoucher>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid voucher code format'],
    },
    profile: {
      type: String,
      enum: ['1-day', '7-day', 'unlimited'],
      required: true,
    },
    status: {
      type: String,
      enum: ['unused', 'used', 'expired'],
      default: 'unused',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    usedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    hotspotUsername: {
      type: String,
    },
    hotspotPassword: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

voucherSchema.index({ status: 1 });

const Voucher: Model<IVoucher> =
  mongoose.models.Voucher || mongoose.model<IVoucher>('Voucher', voucherSchema);

export default Voucher;
