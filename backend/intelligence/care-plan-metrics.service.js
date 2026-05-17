'use strict';

/**
 * care-plan-metrics.service.js — Wave 50.
 *
 * Prometheus metric facade for the care-planning engine. Wraps the
 * optional `prom-client` package so the rest of the codebase imports
 * a stable interface that works even when prom-client isn't installed
 * (CI / test environments). When prom-client is present, real metrics
 * are exported. When absent, every call is a no-op.
 *
 * Metric catalog:
 *
 *   COUNTERS
 *     care_plan_transitions_total          (labels: transition, from_status, to_status)
 *     care_plan_rejections_total           (labels: primary_reason)
 *     care_plan_approvals_total            (labels: plan_type)
 *     care_plan_escalations_total          (labels: trigger_kind)
 *     care_plan_family_send_total          (labels: outcome, channel)
 *     care_plan_family_retry_total         (labels: outcome)
 *     care_plan_overdue_review_total       (labels: severity)
 *     care_plan_plateau_outcome_total      (labels: holistic_verdict)
 *
 *   HISTOGRAMS
 *     care_plan_readiness_score            (buckets [0,50,70,85,90,95,100])
 *     care_plan_review_overall             (buckets [0,4,6,7,8,9,10])
 *     care_plan_days_to_approval           (buckets [0,1,2,3,7,14,30])
 *     care_plan_days_overdue_review        (buckets [1,3,7,14,30,60])
 *     care_plan_goals_at_risk              (buckets [0,1,2,3,5,10])
 *
 *   GAUGES
 *     care_plan_active_plans               (labels: status)
 *     care_plan_family_send_pending_retries
 *
 * Usage:
 *   const metrics = createCarePlanMetrics({ promClient }); // promClient optional
 *   metrics.incTransition('approve', 'under_review', 'approved');
 *   metrics.observeReadinessScore(92);
 *   metrics.registry()  // returns Prom Registry or null
 */

const PROM_BUCKETS = Object.freeze({
  readinessScore: [0, 50, 70, 85, 90, 95, 100],
  reviewOverall: [0, 4, 6, 7, 8, 9, 10],
  daysToApproval: [0, 1, 2, 3, 7, 14, 30],
  daysOverdue: [1, 3, 7, 14, 30, 60],
  goalsAtRisk: [0, 1, 2, 3, 5, 10],
});

const NOOP = () => {};

function _tryRequirePromClient() {
  try {
    return require('prom-client');
  } catch (_) {
    return null;
  }
}

/**
 * @param {object} opts
 *   - promClient    optional override (so tests can inject a mock)
 *   - registry      optional shared registry; otherwise own registry created
 *   - prefix        metric-name prefix (default 'care_plan_')
 */
function createCarePlanMetrics({ promClient = null, registry = null, prefix = 'care_plan_' } = {}) {
  const prom = promClient || _tryRequirePromClient();

  if (!prom) {
    // No-op facade — every method is safe to call
    const noop = {
      incTransition: NOOP,
      incRejection: NOOP,
      incApproval: NOOP,
      incEscalation: NOOP,
      incFamilySend: NOOP,
      incFamilyRetry: NOOP,
      incOverdue: NOOP,
      incPlateauOutcome: NOOP,
      observeReadinessScore: NOOP,
      observeReviewOverall: NOOP,
      observeDaysToApproval: NOOP,
      observeDaysOverdue: NOOP,
      observeGoalsAtRisk: NOOP,
      setActivePlans: NOOP,
      setFamilySendPendingRetries: NOOP,
      registry: () => null,
      isLive: false,
    };
    return Object.freeze(noop);
  }

  const reg = registry || new prom.Registry();

  // Counters
  const transitions = new prom.Counter({
    name: `${prefix}transitions_total`,
    help: 'Care plan state-machine transitions',
    labelNames: ['transition', 'from_status', 'to_status'],
    registers: [reg],
  });
  const rejections = new prom.Counter({
    name: `${prefix}rejections_total`,
    help: 'Care plan rejections by primary reason',
    labelNames: ['primary_reason'],
    registers: [reg],
  });
  const approvals = new prom.Counter({
    name: `${prefix}approvals_total`,
    help: 'Care plan approvals by plan type',
    labelNames: ['plan_type'],
    registers: [reg],
  });
  const escalations = new prom.Counter({
    name: `${prefix}escalations_total`,
    help: 'Care plan escalations by trigger',
    labelNames: ['trigger_kind'],
    registers: [reg],
  });
  const familySends = new prom.Counter({
    name: `${prefix}family_send_total`,
    help: 'Family-version notification dispatches',
    labelNames: ['outcome', 'channel'],
    registers: [reg],
  });
  const familyRetries = new prom.Counter({
    name: `${prefix}family_retry_total`,
    help: 'Family-version retry attempts',
    labelNames: ['outcome'],
    registers: [reg],
  });
  const overdueCounter = new prom.Counter({
    name: `${prefix}overdue_review_total`,
    help: 'Overdue plan reviews by severity',
    labelNames: ['severity'],
    registers: [reg],
  });
  const plateauCounter = new prom.Counter({
    name: `${prefix}plateau_outcome_total`,
    help: 'Plateau detector holistic outcomes',
    labelNames: ['holistic_verdict'],
    registers: [reg],
  });

  // Histograms
  const readinessHist = new prom.Histogram({
    name: `${prefix}readiness_score`,
    help: 'Plan readiness score distribution',
    buckets: PROM_BUCKETS.readinessScore,
    registers: [reg],
  });
  const reviewHist = new prom.Histogram({
    name: `${prefix}review_overall`,
    help: 'Supervisor review overall score distribution',
    buckets: PROM_BUCKETS.reviewOverall,
    registers: [reg],
  });
  const approvalAgeHist = new prom.Histogram({
    name: `${prefix}days_to_approval`,
    help: 'Days from createdAt to approvedAt',
    buckets: PROM_BUCKETS.daysToApproval,
    registers: [reg],
  });
  const overdueHist = new prom.Histogram({
    name: `${prefix}days_overdue_review`,
    help: 'Days a plan review is overdue',
    buckets: PROM_BUCKETS.daysOverdue,
    registers: [reg],
  });
  const atRiskHist = new prom.Histogram({
    name: `${prefix}goals_at_risk`,
    help: 'Number of goals flagged at risk per plan review',
    buckets: PROM_BUCKETS.goalsAtRisk,
    registers: [reg],
  });

  // Gauges
  const activePlansGauge = new prom.Gauge({
    name: `${prefix}active_plans`,
    help: 'Active plans by status',
    labelNames: ['status'],
    registers: [reg],
  });
  const pendingRetriesGauge = new prom.Gauge({
    name: `${prefix}family_send_pending_retries`,
    help: 'Family-send attempts pending retry',
    registers: [reg],
  });

  // ─── Safe wrappers ────────────────────────────────────────────

  function _safe(fn) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (_) {
        /* swallow */
      }
    };
  }

  return Object.freeze({
    incTransition: _safe((transition, fromStatus, toStatus) =>
      transitions.inc({
        transition,
        from_status: fromStatus || 'unknown',
        to_status: toStatus || 'unknown',
      })
    ),
    incRejection: _safe(primary_reason =>
      rejections.inc({ primary_reason: primary_reason || 'unknown' })
    ),
    incApproval: _safe(plan_type => approvals.inc({ plan_type: plan_type || 'unknown' })),
    incEscalation: _safe(trigger_kind =>
      escalations.inc({ trigger_kind: trigger_kind || 'unknown' })
    ),
    incFamilySend: _safe((outcome, channel) =>
      familySends.inc({ outcome: outcome || 'unknown', channel: channel || 'unknown' })
    ),
    incFamilyRetry: _safe(outcome => familyRetries.inc({ outcome: outcome || 'unknown' })),
    incOverdue: _safe(severity => overdueCounter.inc({ severity: severity || 'unknown' })),
    incPlateauOutcome: _safe(holistic_verdict =>
      plateauCounter.inc({ holistic_verdict: holistic_verdict || 'unknown' })
    ),

    observeReadinessScore: _safe(score => {
      if (typeof score === 'number' && !Number.isNaN(score)) readinessHist.observe(score);
    }),
    observeReviewOverall: _safe(overall => {
      if (typeof overall === 'number' && !Number.isNaN(overall)) reviewHist.observe(overall);
    }),
    observeDaysToApproval: _safe(days => {
      if (typeof days === 'number' && days >= 0) approvalAgeHist.observe(days);
    }),
    observeDaysOverdue: _safe(days => {
      if (typeof days === 'number' && days >= 0) overdueHist.observe(days);
    }),
    observeGoalsAtRisk: _safe(count => {
      if (typeof count === 'number' && count >= 0) atRiskHist.observe(count);
    }),

    setActivePlans: _safe((status, count) => {
      if (typeof count === 'number') activePlansGauge.set({ status: status || 'unknown' }, count);
    }),
    setFamilySendPendingRetries: _safe(count => {
      if (typeof count === 'number') pendingRetriesGauge.set(count);
    }),

    registry: () => reg,
    isLive: true,

    // For testing only
    _internal: {
      counters: {
        transitions,
        rejections,
        approvals,
        escalations,
        familySends,
        familyRetries,
        overdueCounter,
        plateauCounter,
      },
      histograms: { readinessHist, reviewHist, approvalAgeHist, overdueHist, atRiskHist },
      gauges: { activePlansGauge, pendingRetriesGauge },
    },
  });
}

module.exports = {
  createCarePlanMetrics,
  PROM_BUCKETS,
};
