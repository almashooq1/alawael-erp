import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRiskAssessment extends Document {
  risk: Types.ObjectId;
  assessmentDate: Date;
  assessedBy: string;
  likelihood: number;
  impact: number;
  notes?: string;
  score: number;
  groupAssessment?: boolean;
  reviewers?: string[];
}

const RiskAssessmentSchema: Schema = new Schema({
  risk: { type: Schema.Types.ObjectId, ref: 'Risk', required: true },
  assessmentDate: { type: Date, default: Date.now },
  assessedBy: { type: String, required: true },
  likelihood: { type: Number, min: 1, max: 5, required: true },
  impact: { type: Number, min: 1, max: 5, required: true },
  notes: { type: String },
  score: { type: Number, required: true },
  groupAssessment: { type: Boolean, default: false },
  reviewers: [{ type: String }],
});

export default mongoose.model<IRiskAssessment>('RiskAssessment', RiskAssessmentSchema);
