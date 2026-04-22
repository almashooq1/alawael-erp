/**
 * builderRegistry.js — central wiring between the catalog's `builder`
 * field (`'<module>.<function>'`) and the actual builder functions.
 *
 * Phase 10 Commit 2.
 *
 * The real rehab builders (`rehabReportBuilders.*`) ship in Phase 9.
 * The rest of the catalog references builders that are planned but
 * not yet implemented — for those we register a safe **stub** that
 * returns a well-formed JSON skeleton. This way:
 *
 *   - the engine is exercisable end-to-end today (no `builder_missing`
 *     errors blocking ops rollout);
 *   - drift tests can catch when catalog references a truly unknown
 *     builder;
 *   - each future commit swaps a stub for a real builder without
 *     touching the engine or the catalog.
 *
 * Registry is a single object keyed by the module name used in the
 * catalog, matching the contract the engine resolves via
 * `resolveBuilder('<module>.<function>', registry)`.
 */

'use strict';

const rehabReportBuilders = require('../rehabReportBuilders');
const attendanceReportBuilder = require('./builders/attendanceReportBuilder');
const sessionReportBuilder = require('./builders/sessionReportBuilder');
const therapistReportBuilder = require('./builders/therapistReportBuilder');
const branchReportBuilder = require('./builders/branchReportBuilder');
const fleetReportBuilder = require('./builders/fleetReportBuilder');
const qualityReportBuilder = require('./builders/qualityReportBuilder');
const financeReportBuilder = require('./builders/financeReportBuilder');

/**
 * Build a stub builder for a category of report. The stub echoes the
 * catalog metadata + period so downstream rendering can still produce
 * a recognisable skeleton pending the real implementation.
 */
function stubBuilder(kind) {
  return async ({ report, periodKey, scopeKey, ctx }) => ({
    reportType: (report && report.id) || kind,
    kind,
    status: 'stub',
    periodKey,
    scopeKey: scopeKey || null,
    nameEn: report && report.nameEn,
    nameAr: report && report.nameAr,
    generatedAt: new Date().toISOString(),
    note: 'Builder is a placeholder — replace in a future phase-10 commit.',
    inputs: Object.keys(ctx || {}),
    summary: {
      items: [],
      headlineMetric: null,
    },
  });
}

const builders = {
  // ─── Real builders (Phase 9 C14) ───────────────────────────────
  rehabReportBuilders: {
    buildIrpSnapshot: rehabReportBuilders.buildIrpSnapshot,
    buildFamilyUpdate: rehabReportBuilders.buildFamilyUpdate,
    buildDisciplineReportCard: rehabReportBuilders.buildDisciplineReportCard,
    buildDischargeSummary: rehabReportBuilders.buildDischargeSummary,
    buildReviewComplianceReport: rehabReportBuilders.buildReviewComplianceReport,
  },

  // ─── Real builders (Phase 10 C7 — replacing stubs) ────────────
  attendanceReportBuilder: {
    buildAdherence: attendanceReportBuilder.buildAdherence,
  },
  sessionReportBuilder: {
    buildVolume: sessionReportBuilder.buildVolume,
  },
  therapistReportBuilder: {
    buildProductivity: therapistReportBuilder.buildProductivity,
    buildCaseload: therapistReportBuilder.buildCaseload,
  },
  branchReportBuilder: {
    buildOccupancy: branchReportBuilder.buildOccupancy,
  },
  fleetReportBuilder: {
    buildPunctuality: fleetReportBuilder.buildPunctuality,
  },
  qualityReportBuilder: {
    buildIncidentsDigest: qualityReportBuilder.buildIncidentsDigest,
    buildIncidentsPack: qualityReportBuilder.buildIncidentsPack,
    buildCbahiEvidence: qualityReportBuilder.buildCbahiEvidence,
    buildRedFlagsDigest: qualityReportBuilder.buildRedFlagsDigest,
  },
  financeReportBuilder: {
    buildClaimsPack: financeReportBuilder.buildClaimsPack,
    buildCollectionsPack: financeReportBuilder.buildCollectionsPack,
    buildRevenueReview: financeReportBuilder.buildRevenueReview,
    buildAgingReport: financeReportBuilder.buildAgingReport,
  },

  // ─── Stubs (to be replaced commit by commit) ───────────────────
  kpiReportBuilder: {
    buildExecDigest: stubBuilder('exec.kpi.digest'),
    buildBoardPack: stubBuilder('exec.kpi.board'),
    buildBranchKpiPack: stubBuilder('branch.kpi.pack'),
  },
  executiveReportBuilder: {
    buildProgramsReview: stubBuilder('exec.programs.review'),
    buildAnnualReport: stubBuilder('exec.annual.report'),
  },
  hrReportBuilder: {
    buildTurnover: stubBuilder('hr.turnover'),
    buildAttendanceAdherence: stubBuilder('hr.attendance.adherence'),
    buildCpeCompliance: stubBuilder('hr.cpe.compliance'),
  },
  crmReportBuilder: {
    buildParentEngagement: stubBuilder('crm.parent.engagement'),
    buildComplaintsDigest: stubBuilder('crm.complaints.digest'),
  },
};

/**
 * True if the given dotted path resolves to a real (non-stub) builder.
 * Used by drift tests to assert the catalog only references known
 * module/function pairs.
 */
function has(builderPath) {
  if (!builderPath || typeof builderPath !== 'string') return false;
  const [mod, fn] = builderPath.split('.');
  return !!(builders[mod] && typeof builders[mod][fn] === 'function');
}

// The set of (module.function) paths that are real implementations,
// not stubs produced by `stubBuilder`. Each P10-C7-followup commit
// extends this set as it swaps a stub for a real builder.
const REAL_BUILDERS = new Set([
  'rehabReportBuilders.buildIrpSnapshot',
  'rehabReportBuilders.buildFamilyUpdate',
  'rehabReportBuilders.buildDisciplineReportCard',
  'rehabReportBuilders.buildDischargeSummary',
  'rehabReportBuilders.buildReviewComplianceReport',
  'attendanceReportBuilder.buildAdherence',
  'sessionReportBuilder.buildVolume',
  'therapistReportBuilder.buildProductivity',
  'therapistReportBuilder.buildCaseload',
  'branchReportBuilder.buildOccupancy',
  'fleetReportBuilder.buildPunctuality',
  'qualityReportBuilder.buildIncidentsDigest',
  'qualityReportBuilder.buildIncidentsPack',
  'qualityReportBuilder.buildCbahiEvidence',
  'qualityReportBuilder.buildRedFlagsDigest',
  'financeReportBuilder.buildClaimsPack',
  'financeReportBuilder.buildCollectionsPack',
  'financeReportBuilder.buildRevenueReview',
  'financeReportBuilder.buildAgingReport',
]);

function isStub(builderPath) {
  if (!has(builderPath)) return false;
  return !REAL_BUILDERS.has(builderPath);
}

module.exports = {
  builders,
  REAL_BUILDERS,
  stubBuilder,
  has,
  isStub,
};
