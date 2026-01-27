import mongoose, { Schema, Document } from 'mongoose';

export interface IRisk extends Document {
  title: string;
  description: string;
  category: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
  owner: string;
  status: 'open' | 'in-progress' | 'closed';
  attachments?: Array<{
    filename: string;
    url: string;
    uploadedAt: Date;
    uploadedBy: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}


const RiskSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  likelihood: { type: Number, min: 1, max: 5, required: true },
  impact: { type: Number, min: 1, max: 5, required: true },
  owner: { type: String, required: true },
  status: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' },
  attachments: [
    {
      filename: { type: String, required: true },
      url: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: { type: String, required: true },
    }
  ],
}, { timestamps: true });

export default mongoose.model<IRisk>('Risk', RiskSchema);
