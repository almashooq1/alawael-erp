'use strict';

/**
 * incidentsHealthAdapter.js — Phase 14 Commit 1 (4.0.63).
 *
 * Thin shim over the existing Incident model that produces the
 * shape the HealthScoreAggregator expects for the `incidents`
 * pillar:
 *
 *   getSummary({ branchId, from, to }) => {
 *     seriousRate,      // severity-weighted open-rate per 1k days
 *     closureRate,      // 0..1, closed-within-SLA fraction
 *     sentinelOpen: []  // open catastrophic/sentinel incidents
 *   }
 *
 * Keeps the SLA table local (per-severity response windows) so
 * the adapter is testable in isolation without loading the
 * `incidentsAnalyticsService.js` heavy module graph.
 */

// Per-severity closure SLA (days). Mirrors the existing
// incidentsAnalyticsService convention but expressed in days
// because the Incident model's `occurredAt`/`closedAt` are Dates.
const SLA_DAYS = Object.freeze({
  insignificant: 14,
  minor: 14,
  moderate: 7,
  major: 3,
  catastrophic: 1,
});

const SERIOUS_SEVERITIES = Object.freeze(['major', 'catastrophic']);
const SENTINEL_SEVERITIES = Object.freeze(['catastrophic']);
const OPEN_STATUSES = Object.freeze([
  'reported',
  'investigating',
  'rca_in_progress',
  'action_plan',
  'monitoring',
]);

function createIncidentsHealthAdapter({ model, logger = console } = {}) {
  if (!model) throw new Error('incidentsHealthAdapter: model is required');

  async function getSummary({ branchId, from, to } = {}) {
    const filter = { deleted_at: null };
    if (branchId) filter.branchId = branchId;
    if (from || to) {
      filter.occurredAt = {};
      if (from) filter.occurredAt.$gte = new Date(from);
      if (to) filter.occurredAt.$lte = new Date(to);
    }

    let docs;
    try {
      docs = await model.find(filter).limit(1000);
    } catch (err) {
      logger.warn(`[incidentsAdapter] query failed: ${err.message}`);
      return { seriousRate: null, closureRate: null, sentinelOpen: [] };
    }
    if (!docs.length) {
      return { seriousRate: 0, closureRate: null, sentinelOpen: [] };
    }

    const nowMs = Date.now();

    // Serious rate: open major+catastrophic per normalised day.
    // Can't know beneficiary-days without a census feed; use a
    // simpler proxy: open-serious fraction × severity weight.
    let seriousOpen = 0;
    let sentinelOpen = [];
    let closed = 0;
    let closedWithinSla = 0;

    for (const d of docs) {
      const sev = d.severity;
      const open = OPEN_STATUSES.includes(d.status);

      if (open && SERIOUS_SEVERITIES.includes(sev)) seriousOpen++;
      if (open && SENTINEL_SEVERITIES.includes(sev)) {
        sentinelOpen.push({
          id: String(d._id),
          incidentNumber: d.incidentNumber,
          occurredAt: d.occurredAt,
          severity: sev,
        });
      }

      if (d.status === 'closed' && d.closedAt && d.occurredAt) {
        closed++;
        const slaDays = SLA_DAYS[sev] ?? 7;
        const ttcDays = (d.closedAt.getTime() - d.occurredAt.getTime()) / 86400000;
        if (ttcDays <= slaDays) closedWithinSla++;
      }
    }

    // seriousRate expressed as open-serious per 1000 incidents in
    // the window (proxy metric the aggregator's scorer expects).
    const seriousRate = docs.length ? (seriousOpen / docs.length) * 10 : 0;
    const closureRate = closed > 0 ? closedWithinSla / closed : null;

    // Cap sentinel list for payload sanity.
    sentinelOpen = sentinelOpen.slice(0, 10);

    return { seriousRate, closureRate, sentinelOpen };
  }

  return { getSummary };
}

module.exports = {
  createIncidentsHealthAdapter,
  SLA_DAYS,
  SERIOUS_SEVERITIES,
  OPEN_STATUSES,
};
