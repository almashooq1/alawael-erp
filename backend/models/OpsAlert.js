'use strict';

/**
 * OpsAlert — W733.
 *
 * Durable, queryable sink for OPERATIONAL alerts (backup failure, DR-verify
 * failure, scheduler crash, …). The ROOT fix for the silent-drop gap:
 *
 *   Before: sendOpsAlert() only tried email/SMS. On prod, SMTP is uncredentialed
 *   (SMTP_USER/SMTP_PASS unset) → unifiedNotifier skips → the alert was LOST,
 *   leaving only a logger.error line in pm2 logs no one watches. A backup could
 *   fail nightly and nobody would know.
 *
 *   After: every sendOpsAlert() FIRST persists an OpsAlert row (guaranteed,
 *   needs no external secret), THEN attempts email/SMS as best-effort delivery.
 *   So an ops failure is ALWAYS captured + surfaceable in the admin UI, and
 *   email/SMS become a bonus channel that lights up the moment creds exist —
 *   never a single point of failure.
 *
 * Lifecycle: open → acknowledged → resolved. TTL-expired after 90 days (PDPL —
 * operational metadata, no PHI).
 *
 * Wave-18 invariants:
 *   • kind + severity non-empty ; severity ∈ SEVERITIES ; status ∈ STATUSES
 *   • status=acknowledged → acknowledgedAt required
 *   • status=resolved → resolvedAt required
 */

const mongoose = require('mongoose');

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'acknowledged', 'resolved'];

// Delivery outcome of the best-effort email/SMS fan-out attached to this alert.
const DELIVERY = ['pending', 'delivered', 'failed', 'no_recipients', 'skipped'];

const OpsAlertSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true, index: true, maxlength: 80 }, // backup_failed / dr_verify_failed / scheduler_crash / selftest
    severity: { type: String, enum: SEVERITIES, required: true, default: 'high', index: true },
    subject: { type: String, required: true, maxlength: 500 },
    body: { type: String, default: '', maxlength: 4000 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    status: { type: String, enum: STATUSES, required: true, default: 'open', index: true },

    // Best-effort external delivery (email/SMS) outcome — the alert is durable
    // regardless of this.
    delivery: { type: String, enum: DELIVERY, default: 'pending' },
    deliveryDetail: { type: String, default: '', maxlength: 1000 },

    firstObservedAt: { type: Date, required: true, default: Date.now },
    lastObservedAt: { type: Date, required: true, default: Date.now },
    observedCount: { type: Number, default: 1 },

    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // 90-day TTL — operational metadata, no PHI (PDPL-aligned retention).
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true, collection: 'ops_alerts' }
);

OpsAlertSchema.index({ status: 1, severity: 1, lastObservedAt: -1 });
OpsAlertSchema.index({ kind: 1, lastObservedAt: -1 });

OpsAlertSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

OpsAlertSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!SEVERITIES.includes(this.severity)) {
    this.invalidate('severity', `must be one of ${SEVERITIES.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (this.status === 'acknowledged' && !this.acknowledgedAt) {
    this.invalidate('acknowledgedAt', 'acknowledgedAt required when status=acknowledged');
    ok = false;
  }
  if (this.status === 'resolved' && !this.resolvedAt) {
    this.invalidate('resolvedAt', 'resolvedAt required when status=resolved');
    ok = false;
  }
  return ok;
});

OpsAlertSchema.virtual('isOpen').get(function () {
  return this.status === 'open';
});

OpsAlertSchema.set('toJSON', { virtuals: true });
OpsAlertSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.OpsAlert || mongoose.model('OpsAlert', OpsAlertSchema);

module.exports.SEVERITIES = SEVERITIES;
module.exports.STATUSES = STATUSES;
module.exports.DELIVERY = DELIVERY;
