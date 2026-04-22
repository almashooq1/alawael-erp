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

  // ─── Stubs (to be replaced commit by commit) ───────────────────
  attendanceReportBuilder: {
    buildAdherence: stubBuilder('attendance.adherence'),
  },
  therapistReportBuilder: {
    buildProductivity: stubBuilder('therapist.productivity'),
    buildCaseload: stubBuilder('therapist.caseload'),
  },
  sessionReportBuilder: {
    buildVolume: stubBuilder('session.volume'),
  },
  branchReportBuilder: {
    buildOccupancy: stubBuilder('branch.occupancy'),
  },
  kpiReportBuilder: {
    buildExecDigest: stubBuilder('exec.kpi.digest'),
    buildBoardPack: stubBuilder('exec.kpi.board'),
    buildBranchKpiPack: stubBuilder('branch.kpi.pack'),
  },
  executiveReportBuilder: {
    buildProgramsReview: stubBuilder('exec.programs.review'),
    buildAnnualReport: stubBuilder('exec.annual.report'),
  },
  qualityReportBuilder: {
    buildIncidentsDigest: stubBuilder('quality.incidents.digest'),
    buildIncidentsPack: stubBuilder('quality.incidents.pack'),
    buildCbahiEvidence: stubBuilder('quality.cbahi.evidence'),
    buildRedFlagsDigest: stubBuilder('quality.red_flags.digest'),
  },
  financeReportBuilder: {
    buildClaimsPack: stubBuilder('finance.claims.pack'),
    buildCollectionsPack: stubBuilder('finance.collections.pack'),
    buildRevenueReview: stubBuilder('finance.revenue.review'),
    buildAgingReport: stubBuilder('finance.invoices.aging'),
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
  fleetReportBuilder: {
    buildPunctuality: stubBuilder('fleet.punctuality'),
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

function isStub(builderPath) {
  if (!has(builderPath)) return false;
  const [mod, fn] = builderPath.split('.');
  return mod !== 'rehabReportBuilders' && typeof builders[mod][fn] === 'function';
}

module.exports = {
  builders,
  stubBuilder,
  has,
  isStub,
};
