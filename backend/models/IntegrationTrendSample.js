/**
 * IntegrationTrendSample — periodic snapshots of each Saudi gov-adapter's
 * health + traffic counters, persisted so the Interop Operations Center can
 * render trends (last 24h / 7d / 30d) rather than the "right-now" view that
 * adapterMetricsRegistry exposes.
 *
 * Captured every 5 minutes by integrationTrendRecorder.service (W211).
 *
 * Counter semantics:
 *   Call counters (callsSuccessCumul/callsFailedCumul/callsRateLimitedCumul)
 *   and DLQ counters are PROCESS-CUMULATIVE — they reset on restart, never
 *   on scrape (matches Prometheus rate() semantics). Consumers compute
 *   interval deltas by diffing adjacent samples; a negative delta means the
 *   process restarted between samples and should be treated as "no data" for
 *   that interval (consistent with prom resets() handling).
 *
 * Latency percentiles are lifetime estimates from the bucketed histogram in
 * adapterMetricsRegistry — they smooth over the process lifetime, but are
 * still useful for "is p95 trending up" panels.
 *
 * TTL: 30 days. Trend pages don't go further back than 30d, and longer
 * retention should live in a real TSDB (Prometheus + Mimir/Cortex).
 */

'use strict';

const mongoose = require('mongoose');

const RETENTION_DAYS = parseInt(process.env.INTEGRATION_TREND_TTL_DAYS, 10) || 30;

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
];

const IntegrationTrendSampleSchema = new mongoose.Schema(
  {
    integration: {
      type: String,
      required: true,
      enum: ADAPTER_NAMES,
      index: true,
    },

    // Bucket-aligned timestamp (5-minute UTC boundary). Multiple workers
    // race to the same (integration, capturedAt) — the unique compound
    // index below deduplicates. capturedAt is the bucket start, not the
    // exact recordSnapshot wall-clock time.
    capturedAt: { type: Date, required: true, index: true },

    // ── Adapter config (snapshot at capture time) ────────────────────────
    mode: { type: String, enum: ['live', 'mock', 'unknown'], default: 'unknown' },
    configured: { type: Boolean, default: true },

    // ── Circuit breaker (snapshot at capture time) ───────────────────────
    circuitOpen: { type: Boolean, default: false },
    circuitFailures: { type: Number, default: 0 },
    circuitCooldownMs: { type: Number, default: 0 },

    // ── Call counters (PROCESS-CUMULATIVE — diff to get interval rate) ──
    callsSuccessCumul: { type: Number, default: 0 },
    callsFailedCumul: { type: Number, default: 0 },
    callsRateLimitedCumul: { type: Number, default: 0 },

    // ── Latency percentiles (lifetime estimate from histogram) ──────────
    // Bucket boundaries from adapterMetricsRegistry: [50, 200, 1000, 5000, +Inf]
    // p* fields are LE values, not exact — best the histogram can give.
    latencyP50Ms: { type: Number, default: null },
    latencyP95Ms: { type: Number, default: null },
    latencyP99Ms: { type: Number, default: null },
    latencyCount: { type: Number, default: 0 },

    // ── DLQ counters (PROCESS-CUMULATIVE) ────────────────────────────────
    dlqParkedCumul: { type: Number, default: 0 },
    dlqResolvedCumul: { type: Number, default: 0 },
    dlqReplaySuccessCumul: { type: Number, default: 0 },
    dlqReplayFailCumul: { type: Number, default: 0 },
    dlqDiscardedCumul: { type: Number, default: 0 },
    // Derived but stored — saves clients having to recompute on every read.
    dlqParkedNet: { type: Number, default: 0 },

    // ── Rate-limiter snapshot (current state, not cumulative) ────────────
    rateLimitUtilizationPct: { type: Number, default: null }, // 0..100

    // ── Source / instrumentation ─────────────────────────────────────────
    // 'scheduler' = cron tick; 'manual' = operator triggered;
    // 'test' = test harness. Useful for filtering noise out of trend panels.
    source: { type: String, default: 'scheduler', enum: ['scheduler', 'manual', 'test'] },

    // Auto-delete after retention window
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// Race-safe dedup: two workers writing the same 5-min bucket lose to E11000.
IntegrationTrendSampleSchema.index({ integration: 1, capturedAt: 1 }, { unique: true });

// Trend page query — newest first, per integration.
IntegrationTrendSampleSchema.index({ integration: 1, capturedAt: -1 });

// TTL — auto-purge old samples (Mongo background sweeper).
IntegrationTrendSampleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

IntegrationTrendSampleSchema.statics.ADAPTER_NAMES = ADAPTER_NAMES;
IntegrationTrendSampleSchema.statics.RETENTION_DAYS = RETENTION_DAYS;

module.exports =
  mongoose.models.IntegrationTrendSample ||
  mongoose.model('IntegrationTrendSample', IntegrationTrendSampleSchema);
