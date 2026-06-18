/**
 * integrationHealthService — KPI-facing facade over the integration-health
 * aggregator. Exposes the `buildSnapshot` method expected by kpi.registry
 * and computes a 0-100 composite score from the raw snapshot.
 */

'use strict';

const aggregator = require('./integrationHealthAggregator');

async function buildSnapshot(opts = {}) {
  const snap = await aggregator.buildSnapshot(opts);
  let penalty = 0;
  if (snap.overall === 'degraded') penalty += 15;
  if (snap.overall === 'critical') penalty += 35;
  penalty += Math.min(25, (snap.headline?.openCircuits || 0) * 10);
  penalty += Math.min(15, snap.headline?.parkedNet || 0);
  const replay = snap.headline?.dlqReplaySuccessRate;
  if (typeof replay === 'number') {
    penalty += Math.max(0, (1 - replay) * 10);
  }
  return {
    ...snap,
    composite: {
      score: Math.max(0, Math.min(100, 100 - penalty)),
    },
  };
}

module.exports = {
  buildSnapshot,
};
