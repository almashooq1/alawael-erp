'use strict';

/**
 * llm-anomaly-history.service.js — Wave 144.
 *
 * Mirrors Wave 114 (hikvision-anomaly-history.service.js) for the LLM
 * anomaly detector from Wave 142. Persists detector snapshots in
 * LlmAnomalySnapshot + exposes time-series queries for the trend
 * chart.
 *
 * Public API:
 *   recordSnapshot({ detectionResult, source, meta, durationMs })
 *     → { ok, snapshot } | { ok:false, reason, errors }
 *   listRecent({ limit, since, source? })
 *     → { ok, items, total }
 *   getTrend({ hours? = 24, bucketMinutes? = 30 })
 *     → { ok, windowHours, bucketMinutes, buckets[] }
 *
 * Trend bucketing is done in JS (cheap at 30-day max retention).
 * Trends use GAUGE semantics — anomalies are current-state, not
 * counters, so each bucket carries the LATEST snapshot's summary
 * that fell into it. Empty buckets carry zeros.
 *
 * Notes:
 *   - Detector emits verbose `details`; we strip down to
 *     {id, kind, severity} before persisting.
 *   - recordSnapshot is the only writer. Routes/scheduler call it.
 *   - On detector ok:false we DO NOT persist — the alternative
 *     would pollute the trend with phantom "0 anomalies" rows during
 *     outages, which is exactly the opposite of what the chart is
 *     for.
 */

const { ANOMALY_SEVERITY, REASON } = require('./llm-anomaly-detector.service');

function createLlmAnomalyHistoryService({
  snapshotModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!snapshotModel) {
    throw new Error('llm-anomaly-history: snapshotModel is required');
  }

  // ─── Writer ──────────────────────────────────────────────────

  async function recordSnapshot({
    detectionResult,
    source = 'scheduler',
    meta = {},
    durationMs,
  } = {}) {
    if (!detectionResult || detectionResult.ok === false) {
      return {
        ok: false,
        reason: REASON.ANOMALY_SCAN_FAILED,
        message: (detectionResult && detectionResult.message) || 'detector returned ok=false',
      };
    }

    const rawItems = Array.isArray(detectionResult.items) ? detectionResult.items : [];
    const items = rawItems.map(a => ({
      id: String(a.id || ''),
      kind: a.kind,
      severity: a.severity,
    }));
    const summary = detectionResult.summary || {
      total: items.length,
      critical: items.filter(a => a.severity === ANOMALY_SEVERITY.CRITICAL).length,
      warning: items.filter(a => a.severity === ANOMALY_SEVERITY.WARNING).length,
      info: items.filter(a => a.severity === ANOMALY_SEVERITY.INFO).length,
    };

    const doc = new snapshotModel({
      recordedAt: now(),
      source,
      items,
      summary,
      durationMs: typeof durationMs === 'number' ? durationMs : null,
      meta: meta || {},
    });

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error && logger.error('[llm-anomaly-history] save failed:', err.message);
      return { ok: false, reason: REASON.SAVE_FAILED };
    }
    return { ok: true, snapshot: doc.toObject ? doc.toObject() : doc };
  }

  // ─── Readers ─────────────────────────────────────────────────

  async function listRecent({ limit = 50, since = null, source = null } = {}) {
    const filter = {};
    if (source) filter.source = source;
    if (since) {
      const d = since instanceof Date ? since : new Date(since);
      if (!Number.isNaN(d.getTime())) filter.recordedAt = { $gte: d };
    }
    const cappedLimit = Math.max(1, Math.min(500, Number(limit) || 50));
    let q = snapshotModel.find(filter).sort({ recordedAt: -1 }).limit(cappedLimit);
    if (typeof q.lean === 'function') q = q.lean();
    const items = await q;
    const total =
      typeof snapshotModel.countDocuments === 'function'
        ? await snapshotModel.countDocuments(filter)
        : (items || []).length;
    return { ok: true, items: items || [], total };
  }

  async function getTrend({ hours = 24, bucketMinutes = 30 } = {}) {
    const safeHours = Math.max(1, Math.min(30 * 24, Number(hours) || 24));
    const safeBucket = Math.max(5, Math.min(24 * 60, Number(bucketMinutes) || 30));

    const endMs = now().getTime();
    const startMs = endMs - safeHours * 60 * 60_000;
    const since = new Date(startMs);

    let q = snapshotModel.find({ recordedAt: { $gte: since } }).sort({ recordedAt: 1 });
    if (typeof q.lean === 'function') q = q.lean();
    const rows = (await q) || [];

    const bucketMs = safeBucket * 60_000;
    const bucketCount = Math.ceil((endMs - startMs) / bucketMs);
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const at = new Date(startMs + i * bucketMs);
      return {
        at: at.toISOString(),
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
        hasData: false,
      };
    });

    for (const r of rows) {
      const t = new Date(r.recordedAt).getTime();
      if (t < startMs || t >= endMs) continue;
      const idx = Math.min(bucketCount - 1, Math.floor((t - startMs) / bucketMs));
      const b = buckets[idx];
      const rowTs = new Date(r.recordedAt).getTime();
      const curTs = b._latestTs || 0;
      if (rowTs >= curTs) {
        b.total = r.summary?.total || 0;
        b.critical = r.summary?.critical || 0;
        b.warning = r.summary?.warning || 0;
        b.info = r.summary?.info || 0;
        b.hasData = true;
        b._latestTs = rowTs;
      }
    }
    for (const b of buckets) {
      delete b._latestTs;
    }

    return {
      ok: true,
      windowHours: safeHours,
      bucketMinutes: safeBucket,
      buckets,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const [k, v] of Object.entries(err.errors)) {
        errors[k] = (v && v.message) || String(v);
      }
    }
    return { ok: false, reason: REASON.VALIDATION_FAILED, errors };
  }

  return { recordSnapshot, listRecent, getTrend };
}

module.exports = { createLlmAnomalyHistoryService };
