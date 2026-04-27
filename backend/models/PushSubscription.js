/**
 * PushSubscription — staff WebPush endpoints, one per device/browser.
 * Phase 30. Created when admin clicks "تفعيل التنبيهات" in the dashboard.
 */

'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, maxlength: 300 },
    enabled: { type: Boolean, default: true, index: true },
    lastError: { type: String, maxlength: 300 },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PushSubscription || mongoose.model('PushSubscription', schema);
