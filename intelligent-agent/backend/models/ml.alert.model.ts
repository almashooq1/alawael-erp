import mongoose, { Schema, Document } from 'mongoose';

export interface IMLAlert extends Document {
  processId?: string;
  processName?: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  details?: Record<string, any>;
  source: 'feedback-mismatch' | 'drift';
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MLAlertSchema: Schema = new Schema(
  {
    processId: { type: String },
    processName: { type: String },
    severity: { type: String, enum: ['high', 'medium', 'low'], required: true },
    message: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    source: { type: String, enum: ['feedback-mismatch', 'drift'], required: true },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

MLAlertSchema.index({ createdAt: -1 });
MLAlertSchema.index({ severity: 1, createdAt: -1 });
MLAlertSchema.index({ source: 1, createdAt: -1 });
MLAlertSchema.index({ read: 1, createdAt: -1 });
MLAlertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

export default mongoose.model<IMLAlert>('MLAlert', MLAlertSchema);
