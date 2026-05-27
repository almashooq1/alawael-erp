/**
 * integrationAlertEngine.service.js
 *
 * Threshold-based alert engine for the Interop Operations Center. Reads
 * the current adapter health snapshot + recent trend samples, evaluates a
 * fixed set of rules, and writes IntegrationAlert lifecycle events.
 *
 * Rule semantics:
 *   - Each rule has a `code` (from IntegrationAlert.RULE_CODES) and an
 *     `evaluate(ctx)` that returns either null (rule did not fire) or an
 *     object { observed, threshold, severity, title_ar, title_en }.
 *   - On fire: if no `open` alert exists for (integration, code), insert
 *     one. If one already exists, bump lastObservedAt + observedCount.
 *   - On non-fire: if an `open` or `acknowledged` alert exists AND its
 *     last firing was longer than autoResolveAfterMinutes ago, mark it
 *     resolved (reason='auto').
 *
 * Idempotency:
 *   The unique partial index on (integration, ruleCode, status='open')
 *   makes "insert if not exists" race-safe at the DB layer. We catch
 *   E11000 and fall back to updateOne($inc, $set).
 *
 * Failure mode:
 *   evaluate() never throws. Per-rule errors are logged and counted in
 *   the summary; one bad rule can't black out the rest.
 */

'use strict';

const DEFAULT_LOGGER = { info: () => {}, warn: () => {}, error: () => {} };

const DEFAULT_THRESHOLDS = {
  // DLQ_BUILDUP fires when parked-net >= dlqWarn (warning) or >= dlqCritical (critical).
  dlqWarn: 10,
  dlqCritical: 50,
  // HIGH_FAILURE_RATE fires when (failed / (success+failed)) > failureRate
  // over the last `failureWindowMinutes`, AND total calls in the window >= failureMinCalls.
  failureRate: 0.2,
  failureWindowMinutes: 15,
  failureMinCalls: 20,
  // RATE_LIMIT_SATURATION fires when utilization > 90% on the latest sample.
  rateLimitPct: 90,
  // SCHEDULER_STALLED fires when no trend sample has been written in the
  // last (BUCKET_MS × 3) ms = 15 min by default.
  schedulerStallBucketMultiplier: 3,
  schedulerStallBucketMs: 5 * 60 * 1000,
  // Auto-resolve open alerts after this many minutes of non-firing.
  autoResolveAfterMinutes: 15,
};

const RULE_TITLES = {
  CIRCUIT_OPEN: {
    ar: code => `قاطع الدائرة مفتوح لـ ${code.integration} — Upstream يعتبر معطّلاً`,
    en: code => `Circuit breaker open for ${code.integration} — upstream considered down`,
    severity: 'critical',
  },
  DLQ_BUILDUP: {
    ar: code => `تراكم Dead-Letter Queue على ${code.integration} (${code.observed.parkedNet} عنصر)`,
    en: code => `DLQ buildup on ${code.integration} (${code.observed.parkedNet} parked)`,
  },
  UNCONFIGURED_LIVE: {
    ar: code => `${code.integration} في الوضع live لكن الإعدادات ناقصة`,
    en: code => `${code.integration} is in live mode but missing required credentials`,
    severity: 'warning',
  },
  HIGH_FAILURE_RATE: {
    ar: code =>
      `معدّل الفشل المرتفع على ${code.integration} (${Math.round(code.observed.failureRate * 100)}% خلال ${code.threshold.windowMinutes}د)`,
    en: code =>
      `High failure rate on ${code.integration} (${Math.round(code.observed.failureRate * 100)}% over ${code.threshold.windowMinutes}min)`,
    severity: 'warning',
  },
  RATE_LIMIT_SATURATION: {
    ar: code =>
      `استهلاك حصّة الـ rate limit مرتفع على ${code.integration} (${code.observed.utilizationPct}%)`,
    en: code => `Rate-limit saturation on ${code.integration} (${code.observed.utilizationPct}%)`,
    severity: 'warning',
  },
  SCHEDULER_STALLED: {
    ar: () => `جامع عيّنات التكامل متوقف — لا توجد عيّنات جديدة`,
    en: () => `Integration trend scheduler appears stalled — no recent samples`,
    severity: 'critical',
  },
};

function createIntegrationAlertEngine(deps = {}) {
  const IntegrationAlert = deps.IntegrationAlert;
  const IntegrationTrendSample = deps.IntegrationTrendSample;
  const aggregator = deps.aggregator; // { buildSnapshot, ADAPTER_NAMES }
  const logger = deps.logger || DEFAULT_LOGGER;
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(deps.thresholds || {}) };

  if (!IntegrationAlert || typeof IntegrationAlert.create !== 'function') {
    throw new Error('integrationAlertEngine: IntegrationAlert model is required');
  }
  if (!IntegrationTrendSample || typeof IntegrationTrendSample.find !== 'function') {
    throw new Error('integrationAlertEngine: IntegrationTrendSample model is required');
  }
  if (!aggregator || typeof aggregator.buildSnapshot !== 'function') {
    throw new Error('integrationAlertEngine: aggregator with buildSnapshot() is required');
  }

  // ── Rule evaluators ───────────────────────────────────────────────────
  // Each rule reads from `ctx` and returns null (no fire) or
  // { observed, threshold, severity }. Title resolution happens later.

  function ruleCircuitOpen(adapter) {
    if (!adapter.circuitOpen) return null;
    return {
      code: 'CIRCUIT_OPEN',
      integration: adapter.name,
      severity: 'critical',
      observed: {
        circuitOpen: true,
        failures: adapter.circuitFailures,
        cooldownMs: adapter.circuitCooldownMs,
      },
      threshold: { circuitOpen: false },
    };
  }

  function ruleDlqBuildup(adapter, dlq) {
    const entry = dlq.byIntegration?.[adapter.name];
    if (!entry) return null;
    const parkedNet = Math.max(
      0,
      (entry.parked || 0) - (entry.resolved || 0) - (entry.discarded || 0)
    );
    if (parkedNet >= thresholds.dlqCritical) {
      return {
        code: 'DLQ_BUILDUP',
        integration: adapter.name,
        severity: 'critical',
        observed: { parkedNet },
        threshold: { warn: thresholds.dlqWarn, critical: thresholds.dlqCritical },
      };
    }
    if (parkedNet >= thresholds.dlqWarn) {
      return {
        code: 'DLQ_BUILDUP',
        integration: adapter.name,
        severity: 'warning',
        observed: { parkedNet },
        threshold: { warn: thresholds.dlqWarn, critical: thresholds.dlqCritical },
      };
    }
    return null;
  }

  function ruleUnconfiguredLive(adapter) {
    if (adapter.mode === 'live' && adapter.configured === false) {
      return {
        code: 'UNCONFIGURED_LIVE',
        integration: adapter.name,
        severity: 'warning',
        observed: { mode: 'live', configured: false, missing: adapter.missing || [] },
        threshold: { configured: true },
      };
    }
    return null;
  }

  async function ruleHighFailureRate(adapter, now) {
    const windowMs = thresholds.failureWindowMinutes * 60 * 1000;
    const since = new Date(now.getTime() - windowMs);

    const rows = await IntegrationTrendSample.find({
      integration: adapter.name,
      capturedAt: { $gte: since },
    })
      .sort({ capturedAt: 1 })
      .limit(50)
      .lean();

    if (rows.length < 2) return null;

    const first = rows[0];
    const last = rows[rows.length - 1];
    const successDelta = Math.max(0, last.callsSuccessCumul - first.callsSuccessCumul);
    const failedDelta = Math.max(0, last.callsFailedCumul - first.callsFailedCumul);
    const total = successDelta + failedDelta;

    if (total < thresholds.failureMinCalls) return null;
    const failureRate = failedDelta / total;
    if (failureRate <= thresholds.failureRate) return null;

    return {
      code: 'HIGH_FAILURE_RATE',
      integration: adapter.name,
      severity: 'warning',
      observed: { failureRate, total, failed: failedDelta, success: successDelta },
      threshold: {
        failureRate: thresholds.failureRate,
        windowMinutes: thresholds.failureWindowMinutes,
      },
    };
  }

  async function ruleRateLimitSaturation(adapter, now) {
    // Read the latest sample for this integration; rate-limit utilization
    // is a current-state gauge, not a trend, so one sample suffices.
    const latest = await IntegrationTrendSample.findOne({ integration: adapter.name })
      .sort({ capturedAt: -1 })
      .lean();
    if (!latest || latest.rateLimitUtilizationPct == null) return null;
    // Skip stale samples (>1h old) — they're unreliable.
    const ageMs = now.getTime() - new Date(latest.capturedAt).getTime();
    if (ageMs > 60 * 60 * 1000) return null;
    if (latest.rateLimitUtilizationPct <= thresholds.rateLimitPct) return null;
    return {
      code: 'RATE_LIMIT_SATURATION',
      integration: adapter.name,
      severity: 'warning',
      observed: { utilizationPct: latest.rateLimitUtilizationPct },
      threshold: { utilizationPct: thresholds.rateLimitPct },
    };
  }

  async function ruleSchedulerStalled(now) {
    const latest = await IntegrationTrendSample.findOne({}).sort({ capturedAt: -1 }).lean();
    // No samples ever → scheduler has not yet completed a first run; don't
    // confuse "fresh deployment" with "stalled". Once the scheduler ticks
    // even once, a sample exists and we have ground truth to compare against.
    if (!latest) return null;
    const ageMs = now.getTime() - new Date(latest.capturedAt).getTime();
    const stalledThresholdMs =
      thresholds.schedulerStallBucketMultiplier * thresholds.schedulerStallBucketMs;
    if (ageMs <= stalledThresholdMs) return null;
    return {
      code: 'SCHEDULER_STALLED',
      integration: 'system',
      severity: 'critical',
      observed: { lastSampleAt: latest.capturedAt, ageMs },
      threshold: { maxAgeMs: stalledThresholdMs },
    };
  }

  // ── Alert lifecycle ─────────────────────────────────────────────────

  async function fireAlert(firing, now) {
    const titleResolver = RULE_TITLES[firing.code] || {
      ar: c => `${firing.code} على ${c.integration}`,
      en: c => `${firing.code} on ${c.integration}`,
    };
    const baseDoc = {
      integration: firing.integration,
      ruleCode: firing.code,
      severity: firing.severity,
      title_ar: titleResolver.ar(firing),
      title_en: titleResolver.en(firing),
      observed: firing.observed,
      threshold: firing.threshold,
      firstObservedAt: now,
      lastObservedAt: now,
      observedCount: 1,
    };

    try {
      // Try insert — succeeds when no `open` alert exists for this pair.
      await IntegrationAlert.create({ ...baseDoc, status: 'open' });
      return { action: 'opened' };
    } catch (err) {
      if (err && err.code === 11000) {
        // Existing open alert — bump observedCount + lastObservedAt.
        // We also refresh severity (a warning can escalate to critical
        // on re-firing) and the observed payload so operators see
        // current values, not the values at first-observation.
        const upd = await IntegrationAlert.updateOne(
          { integration: firing.integration, ruleCode: firing.code, status: 'open' },
          {
            $set: {
              lastObservedAt: now,
              severity: firing.severity,
              observed: firing.observed,
              threshold: firing.threshold,
            },
            $inc: { observedCount: 1 },
          }
        );
        return { action: 'refreshed', modified: upd.modifiedCount || 0 };
      }
      throw err;
    }
  }

  async function autoResolveStaleAlerts(firingsByKey, now) {
    const staleCutoff = new Date(now.getTime() - thresholds.autoResolveAfterMinutes * 60 * 1000);
    // Open or acknowledged alerts whose lastObservedAt is older than the
    // cutoff AND that aren't in the current firings set — auto-resolve.
    const candidates = await IntegrationAlert.find({
      status: { $in: ['open', 'acknowledged'] },
      lastObservedAt: { $lt: staleCutoff },
    }).lean();
    let resolved = 0;
    for (const c of candidates) {
      const key = `${c.integration}::${c.ruleCode}`;
      if (firingsByKey.has(key)) continue; // still firing, leave open
      await IntegrationAlert.updateOne(
        { _id: c._id },
        {
          $set: {
            status: 'resolved',
            resolvedAt: now,
            resolvedReason: 'auto',
          },
        }
      );
      resolved += 1;
    }
    return resolved;
  }

  // ── Main entry ──────────────────────────────────────────────────────

  async function evaluate({ now = new Date() } = {}) {
    const summary = {
      ranAt: now.toISOString(),
      evaluated: 0,
      fired: 0,
      opened: 0,
      refreshed: 0,
      autoResolved: 0,
      errors: 0,
    };

    let snapshot;
    try {
      snapshot = aggregator.buildSnapshot({ now: now.getTime() });
    } catch (err) {
      logger.error(
        { err: err && err.message },
        'integrationAlertEngine: snapshot collection failed'
      );
      summary.errors += 1;
      return summary;
    }

    const firingsByKey = new Map();

    for (const adapter of snapshot.adapters) {
      summary.evaluated += 1;
      const candidates = [
        () => ruleCircuitOpen(adapter),
        () => ruleDlqBuildup(adapter, snapshot.dlq || { byIntegration: {} }),
        () => ruleUnconfiguredLive(adapter),
        () => ruleHighFailureRate(adapter, now),
        () => ruleRateLimitSaturation(adapter, now),
      ];
      for (const candidate of candidates) {
        let firing = null;
        try {
          firing = await candidate();
        } catch (err) {
          summary.errors += 1;
          logger.warn(
            { adapter: adapter.name, err: err && err.message },
            'integrationAlertEngine: rule evaluation failed'
          );
          continue;
        }
        if (!firing) continue;
        firingsByKey.set(`${firing.integration}::${firing.code}`, firing);
        summary.fired += 1;
        try {
          const r = await fireAlert(firing, now);
          if (r.action === 'opened') summary.opened += 1;
          else if (r.action === 'refreshed') summary.refreshed += 1;
        } catch (err) {
          summary.errors += 1;
          logger.warn(
            { firing, err: err && err.message },
            'integrationAlertEngine: fireAlert failed'
          );
        }
      }
    }

    // System-level rules (not tied to a specific adapter)
    try {
      const sysFiring = await ruleSchedulerStalled(now);
      if (sysFiring) {
        firingsByKey.set(`${sysFiring.integration}::${sysFiring.code}`, sysFiring);
        summary.fired += 1;
        const r = await fireAlert(sysFiring, now);
        if (r.action === 'opened') summary.opened += 1;
        else if (r.action === 'refreshed') summary.refreshed += 1;
      }
    } catch (err) {
      summary.errors += 1;
      logger.warn(
        { err: err && err.message },
        'integrationAlertEngine: scheduler-stalled rule failed'
      );
    }

    try {
      summary.autoResolved = await autoResolveStaleAlerts(firingsByKey, now);
    } catch (err) {
      summary.errors += 1;
      logger.warn(
        { err: err && err.message },
        'integrationAlertEngine: autoResolveStaleAlerts failed'
      );
    }

    logger.info(summary, 'integrationAlertEngine: evaluation complete');
    return summary;
  }

  async function listAlerts({ status, integration, limit = 100, offset = 0 } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (integration) filter.integration = integration;
    const cap = Math.min(500, Math.max(1, Number(limit) || 100));
    const skip = Math.max(0, Number(offset) || 0);
    const [items, total] = await Promise.all([
      IntegrationAlert.find(filter).sort({ lastObservedAt: -1 }).skip(skip).limit(cap).lean(),
      IntegrationAlert.countDocuments(filter),
    ]);
    return { total, limit: cap, offset: skip, items };
  }

  async function acknowledgeAlert({ id, userId, now = new Date() }) {
    const updated = await IntegrationAlert.findOneAndUpdate(
      { _id: id, status: 'open' },
      {
        $set: {
          status: 'acknowledged',
          acknowledgedAt: now,
          acknowledgedBy: userId || null,
        },
      },
      { returnDocument: 'after' }
    ).lean();
    return updated;
  }

  async function resolveAlert({ id, userId, now = new Date() }) {
    const updated = await IntegrationAlert.findOneAndUpdate(
      { _id: id, status: { $in: ['open', 'acknowledged'] } },
      {
        $set: {
          status: 'resolved',
          resolvedAt: now,
          resolvedBy: userId || null,
          resolvedReason: 'manual',
        },
      },
      { returnDocument: 'after' }
    ).lean();
    return updated;
  }

  return {
    evaluate,
    listAlerts,
    acknowledgeAlert,
    resolveAlert,
    // Exposed for tests
    _rules: {
      ruleCircuitOpen,
      ruleDlqBuildup,
      ruleUnconfiguredLive,
      ruleHighFailureRate,
      ruleRateLimitSaturation,
      ruleSchedulerStalled,
    },
    thresholds,
  };
}

module.exports = createIntegrationAlertEngine;
module.exports.DEFAULT_THRESHOLDS = DEFAULT_THRESHOLDS;
module.exports.RULE_TITLES = RULE_TITLES;
