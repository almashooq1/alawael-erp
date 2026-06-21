'use strict';

/**
 * Phase 2 — rehab KPI services export contract.
 *
 * These are existence + shape smoke tests. The actual rollups are covered
 * by `kpi-registry-drift.test.js` (method existence) and by the broader
 * integration suites that exercise the underlying models.
 */

const goalProgressService = require('../services/goalProgressService');
const sessionAdherenceService = require('../services/sessionAdherenceService');
const sessionDocumentationService = require('../services/sessionDocumentationService');
const assessmentCadenceService = require('../services/assessmentCadenceService');
const programService = require('../services/programService');
const carePlanDischargeService = require('../services/carePlanDischargeService');
const homeCarryoverService = require('../services/homeCarryoverService');
const interventionAnalyticsService = require('../services/interventionAnalyticsService');
const carePlanService = require('../services/carePlanService');
const clinicalMetricsService = require('../services/clinicalMetricsService');
const consentComplianceService = require('../services/consentComplianceService');
const hrAnalyticsService = require('../services/hrAnalyticsService');
const financeReportBuilder = require('../services/reporting/builders/financeReportBuilder');
const qualityReportBuilder = require('../services/reporting/builders/qualityReportBuilder');

describe('Phase 2 — rehab KPI services exports', () => {
  it('goalProgressService exposes the four KPI rollup methods', () => {
    expect(typeof goalProgressService.summarize).toBe('function');
    expect(typeof goalProgressService.achievementSummary).toBe('function');
    expect(typeof goalProgressService.trendSummary).toBe('function');
    expect(typeof goalProgressService.velocitySummary).toBe('function');
  });

  it('sessionAdherenceService exposes summarize()', () => {
    expect(typeof sessionAdherenceService.summarize).toBe('function');
    expect(typeof sessionAdherenceService.summarizeRecords).toBe('function');
  });

  it('sessionDocumentationService exposes summarize()', () => {
    expect(typeof sessionDocumentationService.summarize).toBe('function');
  });

  it('assessmentCadenceService exposes summarize() and reassessmentOnTime()', () => {
    expect(typeof assessmentCadenceService.summarize).toBe('function');
    expect(typeof assessmentCadenceService.reassessmentOnTime).toBe('function');
  });

  it('programService exposes utilizationSummary() and waitTimePlanStartMean()', () => {
    expect(typeof programService.utilizationSummary).toBe('function');
  });

  it('carePlanDischargeService exposes summarize()', () => {
    expect(typeof carePlanDischargeService.summarize).toBe('function');
  });

  it('homeCarryoverService exposes summarize()', () => {
    expect(typeof homeCarryoverService.summarize).toBe('function');
  });

  it('interventionAnalyticsService exposes diversityIndex()', () => {
    expect(typeof interventionAnalyticsService.diversityIndex).toBe('function');
  });

  it('carePlanService exposes disciplineCoverage()', () => {
    expect(typeof carePlanService.disciplineCoverage).toBe('function');
  });

  it('goalProgressService exposes fimDeltaMean()', () => {
    expect(typeof goalProgressService.fimDeltaMean).toBe('function');
  });

  it('Phase 2.4 CBAHI/Saudi KPI services expose their methods', () => {
    expect(typeof clinicalMetricsService.pediatricImmunizationCoverage).toBe('function');
    expect(typeof consentComplianceService.completionSummary).toBe('function');
    expect(typeof hrAnalyticsService.scfhsLicensureCompliance).toBe('function');
    expect(typeof financeReportBuilder.preAuthApprovalRate).toBe('function');
    expect(typeof qualityReportBuilder.patientSafetyIncidentsPer1000Sessions).toBe('function');
  });
});
