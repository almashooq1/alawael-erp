/**
 * dashboardKpiResolver.service.js — production KPI resolver for
 * the unified dashboard platform.
 *
 * Phase 18 Commit 2.
 *
 * This module turns the abstract `kpiResolver(kpi, filters) →
 * {value, delta, sparkline, asOf, source}` contract that the
 * dashboard aggregator depends on into something real:
 *
 *   1. **Phase-10 reporting-backed resolution** — for every KPI
 *      whose `dataSource.service` matches a known report builder,
 *      we delegate to `createReportingValueResolver()` from
 *      Phase 10. That covers finance, HR, quality, CRM, scheduling,
 *      fleet, and attendance builders out of the box.
 *
 *   2. **Direct-computer overrides** — for KPIs that don't go
 *      through Phase 10 (integration-health, red-flags, anything
 *      that needs live state rather than a periodised rollup) we
 *      ship a small registry of synchronous computers:
 *         COMPUTERS[kpi.id] = async (kpi, ctx) → number | null
 *      A computer wins over the reporting resolver.
 *
 *   3. **Delta computation** — we call the underlying resolver
 *      twice: once for the current period, once for the prior
 *      period (shifted by one `frequency` unit). The ratio
 *      `(curr - prev) / |prev|` gives us a delta the narrative
 *      engine and the UI can decorate.
 *
 *   4. **In-memory TTL cache** — a small LRU keyed on
 *      `${kpiId}|${filterHash}|${periodKey}` keeps us from hammering
 *      builders on every dashboard fetch. TTL defaults to one
 *      minute for hourly KPIs, longer for slower-frequency ones.
 *      Redis can plug in later via a `backend` parameter without
 *      changing callers.
 *
 *   5. **Fail-soft** — every failure path returns null + a
 *      `source` tag (`reporting:error`, `computer:error`, etc.) so
 *      operators can see where data went missing without the
 *      dashboard blanking out.
 *
 * The resolver is framework-agnostic: no express, no mongoose
 * imports. It takes `modules` + `computers` as injected deps, which
 * makes it trivial to unit-test with stubs.
 */

'use strict';

const crypto = require('crypto');

const {
  createReportingValueResolver,
  defaultPeriodKeyForFrequency,
} = require('./reporting/kpiResolvers');

const TTL_BY_FREQUENCY = Object.freeze({
  hourly: 60 * 1000, // 1 min
  daily: 5 * 60 * 1000, // 5 min
  weekly: 30 * 60 * 1000, // 30 min
  monthly: 60 * 60 * 1000, // 1 hour
});

function ttlFor(kpi) {
  if (!kpi) return 60 * 1000;
  return TTL_BY_FREQUENCY[kpi.frequency] || 60 * 1000;
}

function stableFilterHash(filters) {
  if (!filters || typeof filters !== 'object') return 'ø';
  const keys = Object.keys(filters).sort();
  const payload = keys.map(k => `${k}=${String(filters[k])}`).join('&');
  if (!payload) return 'ø';
  return crypto.createHash('sha1').update(payload).digest('hex').slice(0, 10);
}

function shiftPeriodKey(periodKey, frequency) {
  if (!periodKey || typeof periodKey !== 'string') return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodKey)) {
    const d = new Date(`${periodKey}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  // YYYY-Www
  if (/^\d{4}-W\d{2}$/.test(periodKey)) {
    const [yearStr, weekStr] = periodKey.split('-W');
    let year = Number(yearStr);
    let week = Number(weekStr) - 1;
    if (week <= 0) {
      year -= 1;
      week = 52;
    }
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(periodKey)) {
    const [yearStr, monthStr] = periodKey.split('-');
    let year = Number(yearStr);
    let month = Number(monthStr) - 1;
    if (month <= 0) {
      year -= 1;
      month = 12;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  return null;
}

function safeRatio(curr, prev) {
  if (typeof curr !== 'number' || !Number.isFinite(curr)) return null;
  if (typeof prev !== 'number' || !Number.isFinite(prev)) return null;
  if (prev === 0) return null;
  return (curr - prev) / Math.abs(prev);
}

// ─── Default computer registry ──────────────────────────────────

/**
 * Attempt to resolve integration-health as a 0-100 composite score.
 * Walks the snapshot's top-level `overall` traffic light plus a few
 * numeric knobs (replay success, idempotency hit-rate, open circuits).
 * Score = 100 - penalties.
 */
async function integrationHealthComputer(kpi, ctx) {
  try {
    const aggregator =
      ctx && ctx.modules && ctx.modules.integrationHealthAggregator
        ? ctx.modules.integrationHealthAggregator
        : require('./integrationHealthAggregator');
    const snap = await aggregator.buildSnapshot({ now: Date.now() });
    if (!snap) return null;

    let penalty = 0;
    if (snap.overall === 'degraded') penalty += 15;
    if (snap.overall === 'critical') penalty += 35;
    penalty += Math.min(25, (snap.headline?.openCircuits || 0) * 10);
    penalty += Math.min(15, snap.headline?.parkedNet || 0);
    const replay = snap.headline?.dlqReplaySuccessRate;
    if (typeof replay === 'number') {
      penalty += Math.max(0, (1 - replay) * 10);
    }
    return Math.max(0, Math.min(100, 100 - penalty));
  } catch (_) {
    return null;
  }
}

/**
 * Count active red-flags across Beneficiary-360. If the service
 * isn't wired we return null so classification degrades to unknown
 * rather than misreporting zero.
 */
async function redFlagsActiveComputer(_kpi, ctx) {
  try {
    const svc =
      ctx && ctx.modules && ctx.modules.beneficiary360Service
        ? ctx.modules.beneficiary360Service
        : null;
    if (!svc || typeof svc.listActiveFlags !== 'function') return null;
    const res = await svc.listActiveFlags();
    if (!res) return null;
    if (typeof res.totals?.active === 'number') return res.totals.active;
    if (Array.isArray(res.flags)) return res.flags.length;
    return null;
  } catch (_) {
    return null;
  }
}

const DEFAULT_COMPUTERS = Object.freeze({
  'gov-integrations.integration_health.index': integrationHealthComputer,
  'clinical.red_flags.active.count': redFlagsActiveComputer,
});

// ─── Cache ──────────────────────────────────────────────────────

function createLruCache({ maxEntries = 500 } = {}) {
  const store = new Map();

  return {
    get(key) {
      if (!store.has(key)) return undefined;
      const entry = store.get(key);
      if (entry.expiresAt < Date.now()) {
        store.delete(key);
        return undefined;
      }
      // refresh LRU position
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },
    set(key, value, ttlMs) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      while (store.size > maxEntries) {
        const oldestKey = store.keys().next().value;
        store.delete(oldestKey);
      }
    },
    size() {
      return store.size;
    },
    clear() {
      store.clear();
    },
  };
}

// ─── Public factory ─────────────────────────────────────────────

/**
 * buildDashboardKpiResolver(options) → async (kpi, filters) → shape
 *
 * Options:
 *   - modules:        override map passed to the reporting resolver
 *   - computers:      override map of id → computer. Merged over defaults.
 *   - cache:          a cache with {get, set}. Defaults to in-memory LRU.
 *   - sparklinePoints: integer, N prior-period points (default 6).
 *   - historyStore:   Phase 18 C6 — per-KPI rolling history store.
 *                     Every successful resolve records the value so
 *                     the anomaly detector has material to work with.
 *   - anomalyDetector: Phase 18 C6 — pure detector. When present
 *                     and the history has enough points, the
 *                     resolver attaches an `anomaly` block to every
 *                     HeroKpi payload.
 *   - clock:          { now() → Date } for deterministic tests
 *   - logger
 */
function buildDashboardKpiResolver(options = {}) {
  const clock = options.clock || { now: () => new Date() };
  const logger = options.logger || console;
  const cache = options.cache || createLruCache({ maxEntries: 500 });
  const sparklinePoints = Number.isInteger(options.sparklinePoints) ? options.sparklinePoints : 6;
  const historyStore = options.historyStore || null;
  const anomalyDetector = options.anomalyDetector || null;

  const reportingResolver = createReportingValueResolver({
    modules: options.modules,
    clock,
    logger,
  });

  const computers = Object.assign({}, DEFAULT_COMPUTERS, options.computers || {});

  async function resolveValue(kpi, periodKey, filters, computerCtx) {
    // 1. Direct computer wins.
    const computer = computers[kpi.id];
    if (typeof computer === 'function') {
      try {
        const v = await computer(kpi, computerCtx);
        if (typeof v === 'number' && Number.isFinite(v)) return { value: v, source: 'computer' };
        return { value: null, source: 'computer:empty' };
      } catch (err) {
        if (logger && logger.warn) logger.warn(`[dashKpi] computer ${kpi.id}: ${err.message}`);
        return { value: null, source: 'computer:error' };
      }
    }

    // 2. Phase-10 reporting builders.
    try {
      const v = await reportingResolver(kpi, {
        periodKey,
        scopeKey: filters && filters.branch ? `branch:${filters.branch}` : undefined,
      });
      if (typeof v === 'number' && Number.isFinite(v)) return { value: v, source: 'reporting' };
      return { value: null, source: 'reporting:empty' };
    } catch (err) {
      if (logger && logger.warn) logger.warn(`[dashKpi] reporting ${kpi.id}: ${err.message}`);
      return { value: null, source: 'reporting:error' };
    }
  }

  async function resolveOne(kpi, filters) {
    if (!kpi || !kpi.id) {
      return { value: null, delta: null, sparkline: [], asOf: null, source: 'no-kpi' };
    }

    const periodKey = defaultPeriodKeyForFrequency(kpi.frequency, clock.now());
    const cacheKey = `${kpi.id}|${stableFilterHash(filters)}|${periodKey}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const computerCtx = { modules: options.computerModules || {}, filters };
    const { value, source } = await resolveValue(kpi, periodKey, filters, computerCtx);

    // Delta vs prior period.
    let delta = null;
    let priorValue = null;
    const priorKey = shiftPeriodKey(periodKey, kpi.frequency);
    if (priorKey && source !== 'computer' && source !== 'computer:error') {
      // For direct computers we have no prior snapshot — skip delta.
      const prior = await resolveValue(kpi, priorKey, filters, computerCtx);
      if (typeof prior.value === 'number') {
        priorValue = prior.value;
        delta = safeRatio(value, prior.value);
      }
    }

    // Sparkline — N prior-period values. We reuse the same resolver
    // for simplicity; a future commit can swap in a batched query.
    const sparkline = [];
    if (typeof value === 'number' && source !== 'computer:error') {
      let walkingKey = periodKey;
      for (let i = 0; i < sparklinePoints; i += 1) {
        walkingKey = shiftPeriodKey(walkingKey, kpi.frequency);
        if (!walkingKey) break;
        const pt = await resolveValue(kpi, walkingKey, filters, computerCtx);
        if (typeof pt.value === 'number') {
          sparkline.unshift({ t: walkingKey, v: pt.value });
        }
      }
    }

    // Anomaly detection runs BEFORE we record the current value —
    // otherwise we'd include the current reading in its own
    // baseline and dampen the z-score. The store then receives
    // the value so the NEXT resolve has richer history.
    let anomaly = null;
    const clockNowMs = () => {
      const raw = typeof clock.now === 'function' ? clock.now() : Date.now();
      if (raw && raw.getTime) return raw.getTime();
      return raw;
    };
    const scope = filters && filters.branch ? { branch: filters.branch } : null;

    if (historyStore && typeof value === 'number') {
      if (anomalyDetector && typeof anomalyDetector.detectAnomaly === 'function') {
        try {
          const series = historyStore.series({ kpiId: kpi.id, scope });
          const verdict = anomalyDetector.detectAnomaly({
            kpiId: kpi.id,
            series,
            currentValue: value,
            clock: { now: clockNowMs },
          });
          if (verdict) {
            anomaly = {
              detected: verdict.anomaly,
              severity: verdict.severity,
              zScore: verdict.zScore,
              direction: verdict.direction,
              reason: verdict.reason,
              baseline: verdict.baseline,
            };
          }
        } catch (err) {
          if (logger && logger.warn) logger.warn(`[dashKpi] anomaly ${kpi.id}: ${err.message}`);
        }
      }

      try {
        historyStore.record({
          kpiId: kpi.id,
          scope,
          value,
          t: clockNowMs(),
        });
      } catch (_) {
        // swallow — history is best-effort
      }
    }

    const result = {
      value,
      delta,
      sparkline,
      asOf: clock.now().toISOString(),
      source,
      periodKey,
      priorValue,
      anomaly,
    };

    cache.set(cacheKey, result, ttlFor(kpi));
    return result;
  }

  // The aggregator signature is `(kpi, filters) → Promise<shape>`.
  return async function dashboardKpiResolver(kpi, filters) {
    return resolveOne(kpi, filters || {});
  };
}

module.exports = {
  buildDashboardKpiResolver,
  // exported for tests
  _internals: {
    stableFilterHash,
    shiftPeriodKey,
    safeRatio,
    ttlFor,
    createLruCache,
    integrationHealthComputer,
    redFlagsActiveComputer,
  },
  DEFAULT_COMPUTERS,
};
