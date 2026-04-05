'use strict';

const mongoose = require('mongoose');

const documentAccessLogSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: ['view', 'download', 'print', 'edit', 'delete', 'share', 'sign', 'upload', 'archive'],
      required: true,
    },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    timeseries: false,
  }
);

documentAccessLogSchema.index({ documentId: 1, createdAt: -1 });
documentAccessLogSchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models.DocumentAccessLog || mongoose.model('DocumentAccessLog', documentAccessLogSchema);
