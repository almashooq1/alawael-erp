'use strict';

/**
 * payEquityService.js — data-driven pay-equity analysis over real Employee rows (W1193).
 *
 * Loads the BRANCH-SCOPED active workforce, computes demographic pay gaps +
 * cohort outliers via intelligence/pay-equity.lib, and (optionally) persists an
 * aggregate-only PayEquitySnapshot for trend tracking. The caller (route) is
 * responsible for resolving `branchId` from the authenticated user's effective
 * branch scope — this service never trusts a client-supplied branch.
 *
 * Models are looked up lazily via mongoose so unit tests can register fakes and
 * so load-order can't break a top-level require.
 */

const lib = require('../../intelligence/pay-equity.lib');

function getModel(name) {
  const mongoose = require('mongoose');
  try {
    return mongoose.model(name);
  } catch {
    // not registered yet — try to require the canonical file, then re-read
    try {
      if (name === 'Employee') require('../../models/HR/Employee');
      if (name === 'PayEquitySnapshot') require('../../models/HR/PayEquitySnapshot');
      return mongoose.model(name);
    } catch {
      return null;
    }
  }
}

/** total monthly comp = basic + housing + transport + Σ(other_allowances). */
function totalSalaryOf(emp) {
  const base = Number(emp.basic_salary) || 0;
  const housing = Number(emp.housing_allowance) || 0;
  const transport = Number(emp.transport_allowance) || 0;
  const other = Array.isArray(emp.other_allowances)
    ? emp.other_allowances.reduce((s, a) => s + (Number(a && a.amount) || 0), 0)
    : 0;
  return base + housing + transport + other;
}

/** Project a lean Employee doc to the lib's row shape. */
function toRow(emp) {
  return {
    employeeId: emp._id,
    name: emp.full_name || emp.name || emp.job_title_en || null,
    gender: emp.gender,
    nationality: emp.nationality,
    department: emp.department || null,
    jobTitle: emp.job_title_en || emp.job_title_ar || null,
    salary: totalSalaryOf(emp),
  };
}

/** Map a lib two-group gap (e.g. {maleCount,femaleMedian,…}) → the snapshot's generic shape. */
function gapToSnapshot(gap, labelA, labelB) {
  return {
    aCount: gap[`${labelA}Count`] ?? 0,
    bCount: gap[`${labelB}Count`] ?? 0,
    aMedian: gap[`${labelA}Median`] ?? null,
    bMedian: gap[`${labelB}Median`] ?? null,
    aMean: gap[`${labelA}Mean`] ?? null,
    bMean: gap[`${labelB}Mean`] ?? null,
    medianGapPct: gap.medianGapPct ?? null,
    meanGapPct: gap.meanGapPct ?? null,
    direction: gap.direction ?? null,
    reportable: !!gap.reportable,
  };
}

async function loadWorkforce({ branchId, department }) {
  const Employee = getModel('Employee');
  if (!Employee) {
    const err = new Error('Employee model unavailable');
    err.code = 'MODEL_UNAVAILABLE';
    throw err;
  }
  const filter = { status: 'active', deleted_at: null };
  if (branchId) filter.branch_id = branchId; // branch isolation (caller-resolved)
  if (department) filter.department = department;
  const rows = await Employee.find(filter)
    .select(
      'gender nationality basic_salary housing_allowance transport_allowance other_allowances department job_title_en job_title_ar full_name name'
    )
    .lean();
  return rows.map(toRow);
}

/**
 * Live analysis (no persistence). Returns the full lib analysis including the
 * flagged-individual list (sensitive — route gates the read).
 */
async function analyze({ branchId, department = null, thresholdPct, byTitle = false } = {}) {
  const rows = await loadWorkforce({ branchId, department });
  const opts = {};
  if (Number.isFinite(Number(thresholdPct))) opts.thresholdPct = Number(thresholdPct);
  opts.byTitle = !!byTitle;
  const analysis = lib.analyzePayEquity(rows, opts);
  return {
    scope: { level: department ? 'department' : 'branch', department: department || null },
    branchId: branchId || null,
    ...analysis,
  };
}

/** Run analyze + persist an aggregate-only snapshot (no individuals stored). */
async function snapshot({ branchId, department = null, thresholdPct, byTitle = false, computedBy = null, computedAt } = {}) {
  const PayEquitySnapshot = getModel('PayEquitySnapshot');
  if (!PayEquitySnapshot) {
    const err = new Error('PayEquitySnapshot model unavailable');
    err.code = 'MODEL_UNAVAILABLE';
    throw err;
  }
  const a = await analyze({ branchId, department, thresholdPct, byTitle });
  const doc = await PayEquitySnapshot.create({
    branchId,
    scope: a.scope,
    computedAt: computedAt || new Date(),
    headcount: a.headcount,
    genderGap: gapToSnapshot(a.genderGap, 'male', 'female'),
    nationalityGap: gapToSnapshot(a.nationalityGap, 'saudi', 'nonSaudi'),
    cohortOutliers: a.cohortOutliers,
    equityScore: a.equityScore,
    flaggedCount: a.cohortOutliers.count,
    computedBy,
  });
  return doc;
}

async function listSnapshots({ branchId, department = null, limit = 50 } = {}) {
  const PayEquitySnapshot = getModel('PayEquitySnapshot');
  if (!PayEquitySnapshot) return [];
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (department) filter['scope.department'] = department;
  return PayEquitySnapshot.find(filter)
    .sort({ computedAt: -1 })
    .limit(Math.min(Number(limit) || 50, 200))
    .lean();
}

/** Equity-score + gap-% trend series (oldest→newest) for charting. */
async function trends({ branchId, department = null, limit = 24 } = {}) {
  const snaps = await listSnapshots({ branchId, department, limit });
  return snaps
    .map(s => ({
      computedAt: s.computedAt,
      equityScore: s.equityScore,
      genderMedianGapPct: s.genderGap ? s.genderGap.medianGapPct : null,
      nationalityMedianGapPct: s.nationalityGap ? s.nationalityGap.medianGapPct : null,
      outlierRatePct: s.cohortOutliers ? s.cohortOutliers.ratePct : null,
      headcount: s.headcount,
    }))
    .reverse();
}

/** The flagged (below-cohort) employees — sensitive identity-bearing list. */
async function flaggedEmployees({ branchId, department = null, thresholdPct, byTitle = false } = {}) {
  const a = await analyze({ branchId, department, thresholdPct, byTitle });
  return a.flagged;
}

module.exports = {
  totalSalaryOf,
  toRow,
  gapToSnapshot,
  loadWorkforce,
  analyze,
  snapshot,
  listSnapshots,
  trends,
  flaggedEmployees,
};
