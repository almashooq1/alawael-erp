import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRiskEvent extends Document {
  risk: Types.ObjectId;
  eventDate: Date;
  description: string;
  reportedBy: string;
  impact: number;
  actionTaken?: string;
}

const RiskEventSchema: Schema = new Schema({
  risk: { type: Schema.Types.ObjectId, ref: 'Risk', required: true },
  eventDate: { type: Date, default: Date.now },
  description: { type: String, required: true },
  reportedBy: { type: String, required: true },
  impact: { type: Number, min: 1, max: 5, required: true },
  actionTaken: { type: String },
});

export default mongoose.model<IRiskEvent>('RiskEvent', RiskEventSchema);
