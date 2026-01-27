import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tags?: string[];
  status?: 'active' | 'inactive' | 'lead' | 'prospect' | 'customer';
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema<ICustomer>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  company: { type: String },
  tags: [{ type: String }],
  status: { type: String, enum: ['active', 'inactive', 'lead', 'prospect', 'customer'], default: 'lead' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
