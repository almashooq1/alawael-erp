/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

/**
 * Advanced Ticket Schema - نموذج التذاكر المتقدم
 */

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String },
    content: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
    attachments: [{ fileName: String, fileUrl: String, fileSize: Number }],
  },
  { timestamps: true }
);

const escalationSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  escalatedToName: { type: String },
  reason: { type: String },
  escalatedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
});

const advancedTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    }, // TKT-2026-001

    title: { type: String, required: true },
    description: { type: String, required: true },

    category: {
      type: String,
      enum: [
        'technical', // تقني
        'maintenance', // صيانة
        'hr', // موارد بشرية
        'finance', // مالية
        'general', // عام
        'medical', // طبي
        'it_support', // دعم تقنية المعلومات
        'facilities', // المرافق
      ],
      default: 'general',
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    status: {
      type: String,
      enum: ['open', 'in_progress', 'waiting_on_customer', 'escalated', 'resolved', 'closed'],
      default: 'open',
    },

    // SLA tracking
    sla: {
      responseTime: { type: Number }, // hours
      resolutionTime: { type: Number }, // hours
      firstResponseAt: { type: Date },
      resolvedAt: { type: Date },
      isBreached: { type: Boolean, default: false },
    },

    // Assignee
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assigneeName: { type: String },
    department: { type: String },

    // Reporter
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reporterName: { type: String },

    // Communication
    comments: [commentSchema],
    escalations: [escalationSchema],

    // Tags and metadata
    tags: [{ type: String }],
    attachments: [{ fileName: String, fileUrl: String, fileSize: Number, uploadedAt: Date }],

    // Resolution
    resolution: { type: String },
    satisfactionRating: { type: Number, min: 1, max: 5 },

    closedAt: { type: Date },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes
advancedTicketSchema.index({ status: 1, priority: 1 });
advancedTicketSchema.index({ assignee: 1, status: 1 });
advancedTicketSchema.index({ reporter: 1 });
advancedTicketSchema.index({ category: 1, status: 1 });
advancedTicketSchema.index({ 'sla.isBreached': 1 });

module.exports =
  mongoose.models.AdvancedTicket || mongoose.model('AdvancedTicket', advancedTicketSchema);
