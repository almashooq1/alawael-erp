/**
 * Alert — persistent record of an emitted smart-alerts finding.
 *
 * Lifecycle:
 *   - Engine emits a raised alert → dispatcher creates an Alert document.
 *   - While the condition persists, the same (ruleId, key) stays a
 *     single Alert; subsequent engine runs bump `lastSeenAt`.
 *   - When the condition clears, dispatcher sets `resolvedAt`.
 *
 * One record per (ruleId, key); uniqueness enforced at the DB level.
 */

'use strict';

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../config/constants');

const SEVERITIES = ['info', 'warning', 'high', 'critical'];
const CATEGORIES = ['clinical', 'financial', 'operational', 'quality', 'hr', 'compliance'];

const AlertSchema = new mongoose.Schema(
  {
    ruleId: { type: String, required: true, index: true },
    key: { type: String, required: true },
    severity: { type: String, enum: SEVERITIES, required: true, index: true },
    category: { type: String, enum: CATEGORIES, index: true },
    description: { type: String, required: true },
    message: { type: String, required: true },

    subject: {
      type: {
        type: { type: String }, // resource type
        id: { type: mongoose.Schema.Types.Mixed },
      },
      _id: false,
    },

    [TENANT_FIELD]: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    firstSeenAt: { type: Date, default: Date.now, required: true },
    lastSeenAt: { type: Date, default: Date.now, required: true },
    resolvedAt: { type: Date, default: null, index: true },

    notificationsSent: [
      {
        channel: { type: String, enum: ['email', 'sms', 'whatsapp', 'in_app', 'push'] },
        sentAt: { type: Date },
        recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        success: { type: Boolean },
        error: { type: String },
      },
    ],

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'alerts' }
);

AlertSchema.index({ ruleId: 1, key: 1 }, { unique: true });
AlertSchema.index({ resolvedAt: 1, severity: 1 });

AlertSchema.methods.isResolved = function () {
  return !!this.resolvedAt;
};

AlertSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, resolvedAt: null });
};

module.exports = {
  AlertSchema,
  SEVERITIES,
  CATEGORIES,
  get model() {
    return mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
  },
};
