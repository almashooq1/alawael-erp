import mongoose, { Schema, Document } from 'mongoose';

export type RiskLabel = 'high' | 'medium' | 'low';

export interface IMLFeedback extends Document {
  processId?: string;
  predicted: RiskLabel;
  actual: RiskLabel;
  modelVersion?: string;
  source?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const MLFeedbackSchema: Schema = new Schema(
  {
    processId: { type: String },
    predicted: { type: String, enum: ['high', 'medium', 'low'], required: true },
    actual: { type: String, enum: ['high', 'medium', 'low'], required: true },
    modelVersion: { type: String },
    source: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

MLFeedbackSchema.index({ createdAt: -1 });
MLFeedbackSchema.index({ predicted: 1, actual: 1 });
MLFeedbackSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export default mongoose.model<IMLFeedback>('MLFeedback', MLFeedbackSchema);
