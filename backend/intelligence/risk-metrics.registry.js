'use strict';
/**
 * risk-metrics.registry.js — Wave 297
 *
 * In-memory monotonic counters for the W288-W295 risk-sweep + plan-review
 * lifecycle. Separate from `adapterMetricsRegistry.js` (which is keyed by
 * external gov-provider) because these are internal lifecycle events
 * with their own label dimensions (action, tier, level).
 *
 * Counters (never reset in process; restart resets — Prometheus handles
 * via `resets()`):
 *
 *   risk.alert.backlink.attempted     (label: result ∈ ok|skipped|failed)
 *   risk.plan_review.audit.appended   (label: action ∈ TRIGGERED|ACK|SLA_ESCALATED)
 *   risk.plan_review.audit.failed     (label: reason)
 *   risk.plan_review.audit.verified   (label: result ∈ ok|broken)
 *
 * Usage:
 *   const m = require('./risk-metrics.registry');
 *   m.inc('risk.alert.backlink.attempted', { result: 'ok' });
 *   m.snapshot();        // → flat { name|key=value,key=value: count } map
 *   m.snapshotGrouped(); // → { name: { 'key=value': count } } for routes
 *   m._reset();          // tests only
 */

const _counters = new Map(); // composite key → count

function _key(name, labels) {
  if (!labels) return name;
  const pairs = Object.keys(labels)
    .sort()
    .map(k => `${k}=${labels[k]}`)
    .join(',');
  return pairs ? `${name}|${pairs}` : name;
}

function inc(name, labels = null, n = 1) {
  if (!name) return;
  const k = _key(name, labels);
  _counters.set(k, (_counters.get(k) || 0) + n);
}

function snapshot() {
  const out = {};
  for (const [k, v] of _counters) out[k] = v;
  return out;
}

function snapshotGrouped() {
  /** @type {Record<string, Record<string, number>>} */
  const out = {};
  for (const [k, v] of _counters) {
    const [name, labelPart = ''] = k.split('|');
    if (!out[name]) out[name] = {};
    out[name][labelPart || '_'] = v;
  }
  return out;
}

function _reset() {
  _counters.clear();
}

// Canonical metric names — import from here, never type literally.
const NAMES = Object.freeze({
  BACKLINK_ATTEMPTED: 'risk.alert.backlink.attempted',
  AUDIT_APPENDED: 'risk.plan_review.audit.appended',
  AUDIT_FAILED: 'risk.plan_review.audit.failed',
  AUDIT_VERIFIED: 'risk.plan_review.audit.verified',
  // ── W309 gov adapter lifecycle (Sehhaty / Mudad / DA / Nafath) ─────────
  // Distinct from adapterMetricsRegistry (HTTP-call counters): these track
  // *consent* + *report-submission* business-lifecycle outcomes, scoped by
  // provider so a refused consent on Sehhaty doesn't masquerade as success
  // because the underlying HTTP returned 200.
  GOV_CONSENT: 'gov.adapter.consent', // labels: provider, result ∈ granted|refused|revoked|missing|expired
  GOV_REPORT_SUBMISSION: 'gov.report.submission', // labels: provider, result ∈ ok|failed|skipped, reason?
  // ── W283g RAG retrieval + ingest + embed-error telemetry ──────────────
  // Signals for ops to know:
  //   - is keyword fallback rescuing too often? → upgrade embedder
  //   - are embed errors clustering on auth/rate-limit? → rotate keys / scale up
  //   - how much KB is the org ingesting? → capacity planning
  RAG_RETRIEVE: 'rag.retrieve', // labels: provider, vector ∈ none|some, fallback ∈ unused|rescued|merged
  RAG_INGEST: 'rag.ingest', // labels: provider, sourceDocType
  RAG_EMBED_ERROR: 'rag.embed.error', // labels: provider, code
});

module.exports = { inc, snapshot, snapshotGrouped, _reset, NAMES };
