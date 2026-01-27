import mongoose, { Schema, Document } from 'mongoose';

export interface IRiskAuditLog extends Document {
  riskId: string;
  action: string;
  user: string;
  timestamp: Date;
  details?: any;
}

const RiskAuditLogSchema: Schema = new Schema({
  riskId: { type: String, required: true },
  action: { type: String, required: true },
  user: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: Schema.Types.Mixed },
});

export default mongoose.model<IRiskAuditLog>('RiskAuditLog', RiskAuditLogSchema);
