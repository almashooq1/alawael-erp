'use strict';

/**
 * intelligence/risk — Wave 286 barrel
 * Unified Beneficiary Risk Orchestrator (read-only aggregator over
 * existing scorers, tied to the Canonical Data Model).
 */

const orchestrator = require('./orchestrator');
const registry = require('./registry');

module.exports = {
  getBeneficiaryRiskProfile: orchestrator.getBeneficiaryRiskProfile,
  listSources: orchestrator.listSources,
  TIER_THRESHOLDS: registry.TIER_THRESHOLDS,
  TIERS_AR: registry.TIERS_AR,
  SOURCE_WEIGHTS: registry.SOURCE_WEIGHTS,
  tierFromScore: registry.tierFromScore,
};
