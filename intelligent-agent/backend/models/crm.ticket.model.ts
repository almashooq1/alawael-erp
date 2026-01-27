import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITicket extends Document {
  subject: string;
  customer: Types.ObjectId;
  status: 'open' | 'pending' | 'closed' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: Types.ObjectId;
  messages: {
    sender: Types.ObjectId;
    message: string;
    createdAt: Date;
  }[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema: Schema = new Schema<ITicket>({
  subject: { type: String, required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  status: { type: String, enum: ['open', 'pending', 'closed', 'resolved'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  messages: [{
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<ITicket>('Ticket', TicketSchema);
