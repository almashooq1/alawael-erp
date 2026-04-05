'use strict';

const mongoose = require('mongoose');

const broadcastMessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    targetAudience: {
      type: String,
      enum: ['all', 'branch', 'department', 'guardians', 'employees', 'specific'],
      required: true,
    },
    targetFilters: { type: mongoose.Schema.Types.Mixed, default: null },
    channels: {
      type: [String],
      enum: ['sms', 'whatsapp', 'email', 'push'],
      default: ['database'],
    },
    subject: { type: String, default: null },
    bodyAr: { type: String, required: true },
    bodyEn: { type: String, default: null },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    totalRecipients: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'approved', 'sending', 'sent', 'cancelled'],
      default: 'draft',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

broadcastMessageSchema.index({ status: 1, scheduledAt: 1 });
broadcastMessageSchema.index({ senderId: 1, createdAt: -1 });

module.exports =
  mongoose.models.BroadcastMessage || mongoose.model('BroadcastMessage', broadcastMessageSchema);
