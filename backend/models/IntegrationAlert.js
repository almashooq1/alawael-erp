/**
 * IntegrationAlert — operator-visible alert lifecycle for the Interop
 * Operations Center. Fired by integrationAlertEngine when a rule fires
 * against the current trend / health state, resolved automatically when
 * the condition clears (or manually by an operator).
 *
 * One open alert per (integration, ruleCode) — the unique sparse index
 * below enforces this, making rule re-evaluation idempotent. When a rule
 * fires again while an `open` alert exists, the engine bumps
 * lastObservedAt + observedCount instead of inserting a duplicate.
 *
 * TTL: 90 days on `expiresAt`. Long enough to retrospect "did GOSI flap
 * last month?" but short enough not to bloat the collection.
 *
 * State machine:
 *
 *      [open] ──ack──► [acknowledged] ──resolve──► [resolved]
 *        │                                            ▲
 *        └────────────auto-resolve / resolve──────────┘
 *
 * Auto-resolve happens when the alert engine sees the rule no longer
 * fires for `autoResolveAfterMinutes` (default 15). Manual resolve via
 * POST /admin/ops/integration-health/alerts/:id/resolve.
 */

'use strict';

const mongoose = require('mongoose');

const RETENTION_DAYS = parseInt(process.env.INTEGRATION_ALERT_TTL_DAYS, 10) || 90;

const ADAPTER_NAMES = [
  'gosi',
  'scfhs',
  'absher',
  'qiwa',
  'nafath',
  'fatoora',
  'muqeem',
  'nphies',
  'wasel',
  'balady',
  // 'system' is reserved for cross-cutting alerts (e.g. scheduler stalled)
  'system',
];

const RULE_CODES = [
  'CIRCUIT_OPEN', // adapter circuit breaker is currently open
  'DLQ_BUILDUP', // net parked items >= threshold (default 50)
  'UNCONFIGURED_LIVE', // adapter is in live mode but missing credentials
  'HIGH_FAILURE_RATE', // rolling failure rate > threshold over window
  'RATE_LIMIT_SATURATION', // utilization > 90% sustained
  'SCHEDULER_STALLED', // no trend sample written in expected interval × 3
];

const SEVERITIES = ['info', 'warning', 'critical'];
const STATUSES = ['open', 'acknowledged', 'resolved'];

const IntegrationAlertSchema = new mongoose.Schema(
  {
    integration: {
      type: String,
      required: true,
      enum: ADAPTER_NAMES,
      index: true,
    },
    ruleCode: { type: String, required: true, enum: RULE_CODES, index: true },
    severity: { type: String, required: true, enum: SEVERITIES, default: 'warning' },

    status: { type: String, required: true, enum: STATUSES, default: 'open', index: true },

    // Human-readable Arabic + English labels. The engine sets these
    // from the rule definition; UI shows the Arabic by default.
    title_ar: { type: String, required: true },
    title_en: { type: String, default: '' },

    // The observed value that triggered the rule (e.g. parkedNet=72) so
    // operators don't need to query the trend collection to understand
    // why the alert fired.
    observed: { type: mongoose.Schema.Types.Mixed, default: {} },
    threshold: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Lifecycle timestamps
    firstObservedAt: { type: Date, required: true, default: Date.now },
    lastObservedAt: { type: Date, required: true, default: Date.now },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedReason: {
      type: String,
      enum: ['auto', 'manual', null],
      default: null,
    },

    // How many evaluation ticks saw the rule firing while this alert was
    // open. Useful for "this flapped 14 times" UX.
    observedCount: { type: Number, default: 1 },

    // Auto-purge after retention window
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// Exactly one open alert per (integration, ruleCode). Partial index lets
// resolved/acknowledged duplicates coexist (history).
IntegrationAlertSchema.index(
  { integration: 1, ruleCode: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'open' },
  }
);

IntegrationAlertSchema.index({ status: 1, lastObservedAt: -1 });
IntegrationAlertSchema.index({ integration: 1, createdAt: -1 });
IntegrationAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

IntegrationAlertSchema.statics.RULE_CODES = RULE_CODES;
IntegrationAlertSchema.statics.SEVERITIES = SEVERITIES;
IntegrationAlertSchema.statics.STATUSES = STATUSES;
IntegrationAlertSchema.statics.ADAPTER_NAMES = ADAPTER_NAMES;

module.exports =
  mongoose.models.IntegrationAlert || mongoose.model('IntegrationAlert', IntegrationAlertSchema);
