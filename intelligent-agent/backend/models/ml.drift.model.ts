import mongoose, { Schema, Document } from 'mongoose';

export interface IMLDriftEvent extends Document {
  status: 'drift-detected' | 'stable';
  windowSize: number;
  baselineSize: number;
  accuracyDrop: number;
  f1Drop: number;
  recent: {
    accuracy: number;
    f1Score: number;
  };
  baseline: {
    accuracy: number;
    f1Score: number;
  };
  thresholds: {
    accuracyDrop: number;
    f1Drop: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MLDriftSchema: Schema = new Schema(
  {
    status: { type: String, enum: ['drift-detected', 'stable'], required: true },
    windowSize: { type: Number, required: true },
    baselineSize: { type: Number, required: true },
    accuracyDrop: { type: Number, required: true },
    f1Drop: { type: Number, required: true },
    recent: {
      accuracy: { type: Number, required: true },
      f1Score: { type: Number, required: true },
    },
    baseline: {
      accuracy: { type: Number, required: true },
      f1Score: { type: Number, required: true },
    },
    thresholds: {
      accuracyDrop: { type: Number, required: true },
      f1Drop: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

MLDriftSchema.index({ createdAt: -1 });
MLDriftSchema.index({ status: 1, createdAt: -1 });
MLDriftSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

export default mongoose.model<IMLDriftEvent>('MLDriftEvent', MLDriftSchema);
