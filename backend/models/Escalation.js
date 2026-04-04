'use strict';

const mongoose = require('mongoose');

const escalationHistorySchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    reason: { type: String },
    response: { type: String },
  },
  { _id: false }
);

const escalationSchema = new mongoose.Schema(
  {
    escalatableType: { type: String, required: true }, // 'Complaint' | 'Incident' | 'Message'
    escalatableId: { type: mongoose.Schema.Types.ObjectId, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    type: {
      type: String,
      enum: ['complaint', 'incident', 'sla_breach', 'clinical_risk'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    currentLevel: { type: Number, default: 1 }, // 1=مشرف, 2=مدير, 3=مدير عمليات, 4=رئيس تنفيذي
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, required: true },
    escalationHistory: { type: [escalationHistorySchema], default: [] },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNotes: { type: String, default: null },
    slaDeadlines: {
      acknowledge: { type: String }, // e.g., '1h', '30m'
      resolve: { type: String },
    },
    slaBreached: { type: Boolean, default: false },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

escalationSchema.index({ branchId: 1, status: 1 });
escalationSchema.index({ assignedTo: 1, status: 1 });
escalationSchema.index({ escalatableType: 1, escalatableId: 1 });
escalationSchema.index({ priority: 1, createdAt: -1 });

module.exports = mongoose.model('Escalation', escalationSchema);
