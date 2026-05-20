/**
 * integrationTrendRecorder.service.js
 *
 * Periodically materializes the in-memory adapter health/metrics state into
 * persistent `IntegrationTrendSample` rows. Powers the Interop Operations
 * Center's trend panels (last 24h / 7d / 30d) and the alert engine's
 * sliding-window evaluator.
 *
 * Why this exists:
 *   adapterMetricsRegistry + integrationHealthAggregator are RIGHT-NOW
 *   views. The Next.js /admin/ops/integration-health page already polls
 *   them every 10s — but that only shows the present, not how the present
 *   compares to "an hour ago" or "yesterday". This recorder writes one row
 *   per (integration, 5-min bucket) into Mongo, which any consumer can
 *   then query as a time series.
 *
 * Bucketing:
 *   capturedAt is snapped to the nearest 5-minute UTC boundary. The unique
 *   compound index (integration, capturedAt) on the model makes concurrent
 *   writers from multiple processes race to one row — losers get E11000
 *   and we swallow it (the surviving write is just as valid).
 *
 * Latency percentiles:
 *   We approximate p50/p95/p99 from the bucketed histogram
 *   [50, 200, 1000, 5000, +Inf]. Within a bucket we LINEAR-INTERPOLATE
 *   between the bucket boundaries. This is the same approach Prometheus's
 *   histogram_quantile() uses; it's good enough for trend panels but not
 *   for SLO accounting (use raw observations for that).
 *
 * Failure mode:
 *   recordOnce() never throws. It logs and returns a summary. The
 *   scheduler that wraps it must not crash the process if the recorder
 *   trips on a single adapter.
 */

'use strict';

const DEFAULT_LOGGER = { info: () => {}, warn: () => {}, error: () => {} };

// Bucket alignment: capturedAt rounds DOWN to the nearest 5-min UTC boundary.
const BUCKET_MS = 5 * 60 * 1000;

function alignToBucket(date, bucketMs = BUCKET_MS) {
  return new Date(Math.floor(date.getTime() / bucketMs) * bucketMs);
}

/**
 * Approximate a percentile from a bucketed histogram with linear
 * interpolation inside the matching bucket. Matches the prom
 * histogram_quantile() approach for inputs that arrive as cumulative
 * counts; the registry exposes per-bucket (non-cumulative) counts, so we
 * cumulate first.
 *
 * @param {Array<{le: number, count: number}>} buckets
 * @param {number} total                                  total observation count
 * @param {number} q                                      quantile in (0, 1)
 * @returns {number|null}                                 estimated value or null
 */
function approxPercentile(buckets, total, q) {
  if (!Array.isArray(buckets) || buckets.length === 0 || !total || total < 1) return null;
  const targetRank = q * total;

  let cumPrev = 0;
  let lePrev = 0;
  for (const b of buckets) {
    const cum = cumPrev + b.count;
    if (cum >= targetRank) {
      // Inside this bucket. Interpolate between lePrev and b.le.
      // +Inf bucket has no upper bound — return lePrev (the largest finite LE).
      if (b.le === Infinity) return lePrev;
      const within = b.count > 0 ? (targetRank - cumPrev) / b.count : 0;
      return lePrev + within * (b.le - lePrev);
    }
    cumPrev = cum;
    lePrev = b.le === Infinity ? lePrev : b.le;
  }
  return lePrev;
}

/**
 * Build one trend sample object for a single adapter from the current
 * health snapshot + latency snapshot + rate-limiter snapshot.
 * Pure — no IO. Exposed for tests.
 */
function buildSampleForIntegration({
  integration,
  adapterEntry,
  dlqByIntegration,
  latencyForIntegration,
  counterSnapshot,
  rateLimiterStatus,
  capturedAt,
  source = 'scheduler',
}) {
  const dlq = dlqByIntegration[integration] || {};
  const parkedNet = Math.max(0, (dlq.parked || 0) - (dlq.resolved || 0) - (dlq.discarded || 0));

  let p50 = null;
  let p95 = null;
  let p99 = null;
  let latencyCount = 0;
  if (latencyForIntegration && latencyForIntegration.buckets) {
    latencyCount = latencyForIntegration.count || 0;
    p50 = approxPercentile(latencyForIntegration.buckets, latencyCount, 0.5);
    p95 = approxPercentile(latencyForIntegration.buckets, latencyCount, 0.95);
    p99 = approxPercentile(latencyForIntegration.buckets, latencyCount, 0.99);
  }

  const calls = counterSnapshot[integration] || {};

  return {
    integration,
    capturedAt,
    mode: adapterEntry?.mode || 'unknown',
    configured: !!adapterEntry?.configured,
    circuitOpen: !!adapterEntry?.circuitOpen,
    circuitFailures: adapterEntry?.circuitFailures ?? 0,
    circuitCooldownMs: adapterEntry?.circuitCooldownMs ?? 0,
    callsSuccessCumul: calls.success || 0,
    callsFailedCumul: calls.failed || 0,
    callsRateLimitedCumul: calls.rate_limited || 0,
    latencyP50Ms: p50,
    latencyP95Ms: p95,
    latencyP99Ms: p99,
    latencyCount,
    dlqParkedCumul: dlq.parked || 0,
    dlqResolvedCumul: dlq.resolved || 0,
    dlqReplaySuccessCumul: dlq.replay_success || 0,
    dlqReplayFailCumul: dlq.replay_fail || 0,
    dlqDiscardedCumul: dlq.discarded || 0,
    dlqParkedNet: parkedNet,
    rateLimitUtilizationPct: rateLimiterStatus?.utilization ?? null,
    source,
  };
}

/**
 * Factory — wires the recorder to its dependencies. Tests pass mocks;
 * production passes the real services and IntegrationTrendSample model.
 */
function createIntegrationTrendRecorder(deps = {}) {
  const IntegrationTrendSample = deps.IntegrationTrendSample;
  const aggregator = deps.aggregator; // expects { buildSnapshot, ADAPTER_NAMES }
  const metricsRegistry = deps.metricsRegistry; // expects { snapshotCounters, snapshotLatency }
  const rateLimiter = deps.rateLimiter || null;
  const logger = deps.logger || DEFAULT_LOGGER;
  const bucketMs = Number(deps.bucketMs) || BUCKET_MS;

  if (!IntegrationTrendSample || typeof IntegrationTrendSample.create !== 'function') {
    throw new Error(
      'integrationTrendRecorder: IntegrationTrendSample model with .create() is required'
    );
  }
  if (!aggregator || typeof aggregator.buildSnapshot !== 'function') {
    throw new Error('integrationTrendRecorder: aggregator with buildSnapshot() is required');
  }
  if (
    !metricsRegistry ||
    typeof metricsRegistry.snapshotCounters !== 'function' ||
    typeof metricsRegistry.snapshotLatency !== 'function'
  ) {
    throw new Error(
      'integrationTrendRecorder: metricsRegistry with snapshotCounters+snapshotLatency required'
    );
  }

  /**
   * Capture one round of samples — one row per ADAPTER_NAME.
   * Returns a summary { capturedAt, written, deduped, errors }.
   */
  async function recordOnce({ now = new Date(), source = 'scheduler' } = {}) {
    const capturedAt = alignToBucket(now, bucketMs);
    const summary = {
      capturedAt: capturedAt.toISOString(),
      written: 0,
      deduped: 0,
      errors: 0,
    };

    let snapshot;
    let counters;
    let latency;
    try {
      snapshot = aggregator.buildSnapshot({ now: now.getTime() });
      counters = metricsRegistry.snapshotCounters();
      latency = metricsRegistry.snapshotLatency();
    } catch (err) {
      logger.error(
        { err: err && err.message },
        'integrationTrendRecorder: snapshot collection failed'
      );
      summary.errors += 1;
      return summary;
    }

    const adapterNames = aggregator.ADAPTER_NAMES || snapshot.adapters.map(a => a.name);

    for (const integration of adapterNames) {
      const adapterEntry = snapshot.adapters.find(a => a.name === integration) || null;
      const rl =
        rateLimiter && typeof rateLimiter.status === 'function'
          ? safeCall(() => rateLimiter.status(integration), null)
          : null;

      const doc = buildSampleForIntegration({
        integration,
        adapterEntry,
        dlqByIntegration: (snapshot.dlq && snapshot.dlq.byIntegration) || {},
        latencyForIntegration: latency[integration] || null,
        counterSnapshot: counters,
        rateLimiterStatus: rl,
        capturedAt,
        source,
      });

      try {
        await IntegrationTrendSample.create(doc);
        summary.written += 1;
      } catch (err) {
        if (err && err.code === 11000) {
          // Another worker already wrote this bucket — that's fine.
          summary.deduped += 1;
        } else {
          summary.errors += 1;
          logger.warn(
            { integration, err: err && err.message },
            'integrationTrendRecorder: write failed (skipped)'
          );
        }
      }
    }

    logger.info(summary, 'integrationTrendRecorder: capture complete');
    return summary;
  }

  /**
   * Read a time series for one integration over a sliding window.
   * Returns the rows + simple derived deltas (callsSuccessRate, etc.) so
   * UI clients don't have to do the diffing themselves.
   *
   * @param {object} opts
   * @param {string} opts.integration         adapter name (required)
   * @param {Date}   opts.since               window start (default: now - 24h)
   * @param {Date}   [opts.until]             window end (default: now)
   * @param {number} [opts.limit=288]         max samples returned (24h ÷ 5min)
   */
  async function getSeries({ integration, since, until, limit = 288 } = {}) {
    if (!integration) throw new Error('getSeries: integration is required');
    const start = since instanceof Date ? since : new Date(Date.now() - 24 * 3600 * 1000);
    const end = until instanceof Date ? until : new Date();

    const rows = await IntegrationTrendSample.find({
      integration,
      capturedAt: { $gte: start, $lte: end },
    })
      .sort({ capturedAt: 1 })
      .limit(Math.min(2000, Math.max(1, Number(limit) || 288)))
      .lean();

    const series = [];
    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      const prev = i > 0 ? rows[i - 1] : null;
      // A negative delta means a process restart between samples — treat as
      // "no data" for that interval, matching prom resets() semantics.
      const deltaSuccess = prev ? Math.max(0, r.callsSuccessCumul - prev.callsSuccessCumul) : null;
      const deltaFailed = prev ? Math.max(0, r.callsFailedCumul - prev.callsFailedCumul) : null;
      const deltaRateLimited = prev
        ? Math.max(0, r.callsRateLimitedCumul - prev.callsRateLimitedCumul)
        : null;
      const deltaDlqParked = prev ? Math.max(0, r.dlqParkedCumul - prev.dlqParkedCumul) : null;

      series.push({
        capturedAt: r.capturedAt,
        mode: r.mode,
        configured: r.configured,
        circuitOpen: r.circuitOpen,
        circuitFailures: r.circuitFailures,
        latencyP50Ms: r.latencyP50Ms,
        latencyP95Ms: r.latencyP95Ms,
        latencyP99Ms: r.latencyP99Ms,
        rateLimitUtilizationPct: r.rateLimitUtilizationPct,
        dlqParkedNet: r.dlqParkedNet,
        // Cumulative kept for clients that prefer raw counters.
        callsSuccessCumul: r.callsSuccessCumul,
        callsFailedCumul: r.callsFailedCumul,
        // Per-bucket deltas (null on first sample of the window).
        deltaSuccess,
        deltaFailed,
        deltaRateLimited,
        deltaDlqParked,
      });
    }
    return { integration, since: start, until: end, count: series.length, series };
  }

  return { recordOnce, getSeries, buildSampleForIntegration, approxPercentile };
}

function safeCall(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

module.exports = createIntegrationTrendRecorder;
module.exports.BUCKET_MS = BUCKET_MS;
module.exports.alignToBucket = alignToBucket;
module.exports.approxPercentile = approxPercentile;
module.exports.buildSampleForIntegration = buildSampleForIntegration;
