import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOpportunity extends Document {
  title: string;
  customer: Types.ObjectId;
  value: number;
  stage: 'new' | 'qualified' | 'proposal' | 'won' | 'lost';
  expectedClose: Date;
  owner?: Types.ObjectId;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema: Schema = new Schema<IOpportunity>({
  title: { type: String, required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  value: { type: Number, default: 0 },
  stage: { type: String, enum: ['new', 'qualified', 'proposal', 'won', 'lost'], default: 'new' },
  expectedClose: { type: Date },
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
