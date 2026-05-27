'use strict';

/**
 * LlmAnomalyAck — Wave 147.
 *
 * Operator acknowledgement of an LLM anomaly. While an ack is
 * active:
 *   - the live /llm-anomalies endpoint still shows the anomaly
 *     (operator can choose; this isn't deletion)
 *   - but the dispatcher SKIPS delivering anomaly-fired to channels
 *     (no more webhook pings / log spam)
 *
 * Auto-expires via TTL on `expiresAt`. The default duration is
 * caller-supplied — typically 1h / 6h / "until tomorrow". When the
 * underlying anomaly resolves naturally before expiry, the
 * ack-resolved event still fires through channels (the ack only
 * gates FIRE events, not RESOLVE).
 *
 * Wave-18 invariants:
 *   • anomalyId required + non-empty
 *   • acknowledgedAt required
 *   • expiresAt strictly > acknowledgedAt
 *   • reason length capped at 500 to prevent abuse
 */

const mongoose = require('mongoose');

const TTL_MAX_DAYS = 30;

const LlmAnomalyAckSchema = new mongoose.Schema(
  {
    anomalyId: { type: String, required: true, maxlength: 200 },
    acknowledgedAt: { type: Date, required: true, default: Date.now, index: true },
    acknowledgedBy: { type: String, default: null, maxlength: 80 },
    acknowledgedByRole: { type: String, default: null, maxlength: 80 },
    expiresAt: { type: Date, required: true },
    reason: { type: String, default: '', maxlength: 500 },

    // Bookkeeping snapshot of the anomaly at ack-time. Tiny — same
    // {kind, severity, summaryAr} compact shape as the snapshot model.
    anomalyKind: { type: String, default: null, maxlength: 80 },
    anomalySeverity: {
      type: String,
      default: null,
      enum: [null, 'critical', 'warning', 'info'],
    },
    anomalySummary: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true, collection: 'llm_anomaly_acks' }
);

// One active ack per anomalyId. Using a partial unique that ignores
// expired rows means a fresh ack can be created after the previous
// one expires without manual cleanup.
LlmAnomalyAckSchema.index(
  { anomalyId: 1 },
  { unique: true, partialFilterExpression: { expiresAt: { $gt: new Date('2000-01-01') } } }
);

// TTL — Mongo deletes rows where expiresAt < now. Set expireAfterSeconds: 0
// to use the document's expiresAt field directly as the cutoff.
LlmAnomalyAckSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

LlmAnomalyAckSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

LlmAnomalyAckSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!this.anomalyId || !String(this.anomalyId).trim()) {
    this.invalidate('anomalyId', 'required');
    ok = false;
  }
  if (!this.acknowledgedAt) {
    this.invalidate('acknowledgedAt', 'required');
    ok = false;
  }
  if (!this.expiresAt) {
    this.invalidate('expiresAt', 'required');
    ok = false;
  } else if (this.acknowledgedAt && this.expiresAt <= this.acknowledgedAt) {
    this.invalidate('expiresAt', 'must be strictly after acknowledgedAt');
    ok = false;
  } else {
    // Cap maximum silencing duration so a misclick doesn't pin an
    // anomaly invisible for years.
    const maxMs = TTL_MAX_DAYS * 24 * 60 * 60 * 1000;
    if (this.expiresAt.getTime() - this.acknowledgedAt.getTime() > maxMs) {
      this.invalidate('expiresAt', `cannot exceed acknowledgedAt + ${TTL_MAX_DAYS} days`);
      ok = false;
    }
  }

  return ok;
});

module.exports =
  mongoose.models.LlmAnomalyAck || mongoose.model('LlmAnomalyAck', LlmAnomalyAckSchema);

module.exports.LlmAnomalyAckSchema = LlmAnomalyAckSchema;
module.exports.TTL_MAX_DAYS = TTL_MAX_DAYS;
