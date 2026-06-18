/**
 * clinicalMetricsService — pure-math clinical metrics for KPI dashboards.
 */

'use strict';

/**
 * Pediatric immunization coverage rate.
 * `records` = [{ beneficiaryId, requiredCount, completedCount }].
 */
function pediatricImmunizationCoverage(records = []) {
  const valid = records.filter(r => r && Number.isFinite(r.requiredCount) && r.requiredCount > 0);
  if (valid.length === 0) {
    return { coveragePct: null, beneficiaries: 0, fullyImmunized: 0 };
  }
  let fully = 0;
  for (const r of valid) {
    if ((r.completedCount || 0) >= r.requiredCount) fully += 1;
  }
  return {
    coveragePct: Math.round((fully / valid.length) * 1000) / 10,
    beneficiaries: valid.length,
    fullyImmunized: fully,
  };
}

module.exports = {
  pediatricImmunizationCoverage,
};
