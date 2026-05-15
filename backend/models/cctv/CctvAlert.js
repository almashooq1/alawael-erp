/**
 * CctvAlert — actionable alert raised by the rules engine on top of events.
 *
 * Unlike CctvEvent (raw signal), an alert means "a human must look at this".
 * One alert may aggregate many events (e.g. 8 motion events in 1 minute).
 */
'use strict';

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    branchCode: { type: String, required: true, uppercase: true, index: true },
    cameraId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvCamera', index: true },
    cameraCode: { type: String },

    ruleId: { type: String, index: true },
    title_ar: { type: String, required: true },
    title_en: { type: String },
    description: { type: String },

    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },

    category: {
      type: String,
      enum: [
        'intrusion',
        'safety',
        'health',
        'access_control',
        'crowd',
        'fire',
        'fall',
        'fight',
        'tampering',
        'system',
        'ai',
        'compliance',
      ],
      required: true,
      index: true,
    },

    eventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CctvEvent' }],
    eventCount: { type: Number, default: 1 },
    firstEventAt: { type: Date, required: true },
    lastEventAt: { type: Date, required: true },

    status: {
      type: String,
      enum: ['open', 'acknowledged', 'investigating', 'resolved', 'false_positive', 'escalated'],
      default: 'open',
      index: true,
    },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolution: { type: String },

    relatedIncidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      index: true,
      sparse: true,
    },
    notifiedChannels: [{ type: String }],
  },
  { timestamps: true }
);

alertSchema.index({ branchCode: 1, status: 1, severity: 1 });
alertSchema.index({ status: 1, firstEventAt: -1 });

module.exports = mongoose.models.CctvAlert || mongoose.model('CctvAlert', alertSchema);
