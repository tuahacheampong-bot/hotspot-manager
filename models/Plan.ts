import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlan extends Document {
  planId: string;
  name: string;
  description: string;
  duration: string;
  dataLimit: string;
  price: number;
  currency: string;
  features: string[];
  popular: boolean;
  uptimeLimit: string;
  bytesLimit: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    duration: {
      type: String,
      required: true,
    },
    dataLimit: {
      type: String,
      default: 'Unlimited',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'GHS',
    },
    features: {
      type: [String],
      default: [],
    },
    popular: {
      type: Boolean,
      default: false,
    },
    uptimeLimit: {
      type: String,
      default: '0s',
    },
    bytesLimit: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

planSchema.index({ active: 1 });

const Plan: Model<IPlan> = mongoose.models.Plan || mongoose.model<IPlan>('Plan', planSchema);

export default Plan;
