'use strict';

const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    complaintNumber: { type: String, unique: true, required: true }, // CMP-2024-0001
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    source: {
      type: String,
      enum: ['beneficiary', 'guardian', 'employee', 'external', 'anonymous'],
      required: true,
    },
    complainantType: { type: String, default: null }, // 'Beneficiary' | 'Guardian'
    complainantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    complainantName: { type: String, default: null },
    complainantPhone: { type: String, default: null },
    category: {
      type: String,
      enum: [
        'service_quality',
        'staff_behavior',
        'waiting_time',
        'facility',
        'billing',
        'clinical',
        'other',
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    description: { type: String, required: true },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    investigationNotes: { type: String, default: null },
    resolution: { type: String, default: null },
    status: {
      type: String,
      enum: ['open', 'investigating', 'pending_response', 'resolved', 'closed', 'escalated'],
      default: 'open',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    satisfactionRating: { type: Number, min: 1, max: 5, default: null },
    slaTracking: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

complaintSchema.index({ branchId: 1, status: 1 }); // complaintNumber already indexed via unique:true

const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
