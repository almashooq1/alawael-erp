'use strict';

/**
 * smart-platform-metrics.service.js — Wave 435 (Phase F2 — Observability).
 *
 * Prometheus metric facade for the Phase A/B/D2/E1/E4 producer chain.
 * Wraps `prom-client` so this lib is import-safe even when prom-client
 * isn't installed (CI / test). When prom-client is present, real metrics
 * are exported through the existing /metrics endpoint (W26 / W50 pattern).
 *
 * Metric catalog:
 *
 *   COUNTERS
 *     smart_platform_realtime_events_total          (labels: topic_prefix, source_bus)
 *       — W427 SSE broker: incremented per publish() event.
 *     smart_platform_forecast_alerts_total          (labels: action)
 *       — W430 goal forecaster sweeper: action in {created, updated, resolved, skipped}.
 *     smart_platform_escalation_predictions_total   (labels: tier)
 *       — W433/W434 escalation predictor: incremented per source plugin fetch().
 *     smart_platform_inbox_rankings_total           (labels: top_severity)
 *       — W431 SmartInboxRanker: incremented per rankItems() call.
 *     smart_platform_caseload_matches_total         (labels: outcome)
 *       — W432 Caseload Matcher: outcome in {match_found, no_candidates, all_excluded}.
 *
 *   HISTOGRAMS
 *     smart_platform_sweep_duration_seconds         (labels: sweep_name)
 *       — W430 + future sweepers: per-tick duration; buckets tuned for daily
 *         sweeps that should finish <60s.
 *
 *   GAUGES
 *     smart_platform_realtime_active_subscriptions  (no labels)
 *       — W427 SSE broker: snapshot of subscription count for capacity planning.
 *
 * Usage:
 *   const metrics = createSmartPlatformMetrics({ promClient }); // promClient optional
 *   metrics.incRealtimeEvent('quality.capa', 'qualityEventBus');
 *   metrics.incForecastAlert('created');
 *   metrics.observeSweepDuration('goal_forecaster', 12.4);
 *   metrics.setActiveSubscriptions(42);
 *
 * Same pattern as W50 care-plan-metrics.service.js. No-op when prom-client
 * absent — every call returns silently, no throw, no buffering.
 */

const NOOP = () => {};

function _tryRequirePromClient() {
  try {
    return require('prom-client');
  } catch (_) {
    return null;
  }
}

const SWEEP_DURATION_BUCKETS = Object.freeze([0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300]);

/**
 * @param {Object} [opts]
 * @param {Object} [opts.promClient]  — pass through for tests; defaults to require('prom-client')
 * @param {Object} [opts.registry]    — pass a non-default registry for isolation in tests
 * @param {string} [opts.prefix='smart_platform_'] — metric name prefix
 */
function createSmartPlatformMetrics({
  promClient = null,
  registry = null,
  prefix = 'smart_platform_',
} = {}) {
  const prom = promClient || _tryRequirePromClient();
  if (!prom) {
    return {
      enabled: false,
      registry: null,
      incRealtimeEvent: NOOP,
      incForecastAlert: NOOP,
      incEscalationPrediction: NOOP,
      incInboxRanking: NOOP,
      incCaseloadMatch: NOOP,
      observeSweepDuration: NOOP,
      setActiveSubscriptions: NOOP,
    };
  }

  const reg = registry || prom.register;

  const realtimeEvents = new prom.Counter({
    name: `${prefix}realtime_events_total`,
    help: 'Realtime SSE broker events fan-out total. Labels: topic_prefix=first dotted segment, source_bus=integrationBus|qualityEventBus|direct.',
    labelNames: ['topic_prefix', 'source_bus'],
    registers: [reg],
  });

  const forecastAlerts = new prom.Counter({
    name: `${prefix}forecast_alerts_total`,
    help: 'W430 goal forecaster sweeper outcomes per scan. Labels: action=created|updated|resolved|skipped|error.',
    labelNames: ['action'],
    registers: [reg],
  });

  const escalationPredictions = new prom.Counter({
    name: `${prefix}escalation_predictions_total`,
    help: 'W433/W434 EscalationPredictor source plugin invocations. Labels: tier=critical|high|moderate|low|no_data.',
    labelNames: ['tier'],
    registers: [reg],
  });

  const inboxRankings = new prom.Counter({
    name: `${prefix}inbox_rankings_total`,
    help: 'W431 SmartInboxRanker calls. Labels: top_severity=critical|high|medium|low|empty (severity of top-ranked item, "empty" when list was empty).',
    labelNames: ['top_severity'],
    registers: [reg],
  });

  const caseloadMatches = new prom.Counter({
    name: `${prefix}caseload_matches_total`,
    help: 'W432 Caseload Matcher V2 invocations. Labels: outcome=match_found|no_candidates|all_excluded.',
    labelNames: ['outcome'],
    registers: [reg],
  });

  const sweepDuration = new prom.Histogram({
    name: `${prefix}sweep_duration_seconds`,
    help: 'Per-tick duration of smart-platform sweepers. Labels: sweep_name=goal_forecaster|… (future sweepers register here).',
    labelNames: ['sweep_name'],
    buckets: SWEEP_DURATION_BUCKETS,
    registers: [reg],
  });

  const activeSubscriptions = new prom.Gauge({
    name: `${prefix}realtime_active_subscriptions`,
    help: 'W427 SSE broker — current count of open subscriptions. Updated on subscribe/unsubscribe.',
    registers: [reg],
  });

  return {
    enabled: true,
    registry: reg,

    /**
     * Increment the realtime event counter. topic_prefix is the first
     * dotted segment of the broker topic (e.g. "quality.capa.overdue"
     * → "quality"). Keeps cardinality bounded.
     */
    incRealtimeEvent(topic, sourceBus = 'unknown') {
      const prefix = String(topic || 'unknown').split('.')[0] || 'unknown';
      try {
        realtimeEvents.inc({ topic_prefix: prefix, source_bus: sourceBus });
      } catch {
        /* metric blocked — drop silently */
      }
    },

    incForecastAlert(action) {
      try {
        forecastAlerts.inc({ action: String(action || 'unknown') });
      } catch {
        /* drop */
      }
    },

    incEscalationPrediction(tier) {
      try {
        escalationPredictions.inc({ tier: String(tier || 'no_data') });
      } catch {
        /* drop */
      }
    },

    incInboxRanking(topSeverity) {
      try {
        inboxRankings.inc({ top_severity: String(topSeverity || 'empty') });
      } catch {
        /* drop */
      }
    },

    incCaseloadMatch(outcome) {
      try {
        caseloadMatches.inc({ outcome: String(outcome || 'unknown') });
      } catch {
        /* drop */
      }
    },

    /**
     * @param {string} sweepName
     * @param {number} seconds
     */
    observeSweepDuration(sweepName, seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return;
      try {
        sweepDuration.observe({ sweep_name: String(sweepName || 'unknown') }, seconds);
      } catch {
        /* drop */
      }
    },

    setActiveSubscriptions(count) {
      if (!Number.isFinite(count) || count < 0) return;
      try {
        activeSubscriptions.set(count);
      } catch {
        /* drop */
      }
    },
  };
}

module.exports = {
  createSmartPlatformMetrics,
  SWEEP_DURATION_BUCKETS,
  _tryRequirePromClient,
};
