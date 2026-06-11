'use strict';

/**
 * talentGridService.js — 9-box talent-matrix service (W1198).
 *
 * Derives an employee's performance band from the latest APPROVED
 * PerformanceEvaluation, upserts a TalentReview (one per employee per cycle), and
 * aggregates the branch-scoped grid + hiPo / risk segments. The route resolves
 * branchId from the caller's effective scope; lists/grid filter on the
 * TalentReview.branchId the hrBranchScope plugin denormalised.
 *
 * Models looked up lazily so tests can inject fakes + load order can't break.
 */

const grid = require('../../intelligence/talent-grid.lib');

function getModel(name, file) {
  const mongoose = require('mongoose');
  try {
    return mongoose.model(name);
  } catch {
    try {
      require(file);
      return mongoose.model(name);
    } catch {
      return null;
    }
  }
}

/** Latest approved PerformanceEvaluation → performance band (1-3) or null. */
async function derivePerformanceBand(employeeId) {
  const PE = getModel('PerformanceEvaluation', '../../models/HR/PerformanceEvaluation');
  if (!PE) return null;
  const latest = await PE.findOne({ employeeId, status: 'approved' })
    .sort({ 'evaluationPeriod.startDate': -1, createdAt: -1 })
    .select('summary')
    .lean();
  if (!latest || !latest.summary) return null;
  return grid.performanceBand({
    overallRating: latest.summary.overallRating,
    overallScore: latest.summary.overallScore,
  });
}

/**
 * Upsert a talent review. `performanceBand` is optional — when omitted we derive
 * it from PerformanceEvaluation (performanceSource='derived'). Returns the doc.
 */
async function upsertReview({
  employeeId,
  reviewCycle,
  potentialBand,
  performanceBand,
  notes,
  reviewedBy = null,
  status,
} = {}) {
  const TalentReview = getModel('TalentReview', '../../models/HR/TalentReview');
  if (!TalentReview) {
    const err = new Error('TalentReview model unavailable');
    err.code = 'MODEL_UNAVAILABLE';
    throw err;
  }
  if (!employeeId || !reviewCycle) {
    const err = new Error('employeeId and reviewCycle are required');
    err.code = 'VALIDATION';
    throw err;
  }

  let source = 'manual';
  let perf = performanceBand;
  if (perf == null) {
    perf = await derivePerformanceBand(employeeId);
    source = 'derived';
    if (perf == null) {
      const err = new Error('performanceBand not supplied and not derivable (no approved evaluation)');
      err.code = 'NO_PERFORMANCE';
      throw err;
    }
  }

  const existing = await TalentReview.findOne({ employeeId, reviewCycle });
  const doc = existing || new TalentReview({ employeeId, reviewCycle });
  doc.performanceBand = perf;
  doc.potentialBand = potentialBand;
  doc.performanceSource = source;
  if (notes !== undefined) doc.notes = notes;
  if (reviewedBy) doc.reviewedBy = reviewedBy;
  if (status) doc.status = status;
  await doc.save(); // pre('validate') computes box/segment + invariants run
  return doc;
}

function scopeFilter({ branchId, reviewCycle, status }) {
  const f = {};
  if (branchId) f.branchId = branchId; // W269 — caller-resolved branch only
  if (reviewCycle) f.reviewCycle = reviewCycle;
  if (status) f.status = status;
  return f;
}

/** Grid distribution + hiPo/risk rates for a branch + cycle. */
async function gridSummary({ branchId, reviewCycle } = {}) {
  const TalentReview = getModel('TalentReview', '../../models/HR/TalentReview');
  if (!TalentReview) return grid.buildGrid([]);
  const reviews = await TalentReview.find(scopeFilter({ branchId, reviewCycle }))
    .select('box')
    .limit(5000)
    .lean();
  const g = grid.buildGrid(reviews);
  // attach a human label per box for UI rendering
  g.boxes = {};
  for (let b = 1; b <= 9; b++) {
    const seg = grid.segmentOf(b);
    g.boxes[b] = { count: g.counts[b], segment: seg.key, en: seg.en, ar: seg.ar };
  }
  return g;
}

/** Reviews in a given set of boxes, identity-bearing (employee populated). */
async function reviewsInBoxes({ branchId, reviewCycle, boxes } = {}) {
  const TalentReview = getModel('TalentReview', '../../models/HR/TalentReview');
  if (!TalentReview) return [];
  const f = scopeFilter({ branchId, reviewCycle });
  f.box = { $in: boxes };
  return TalentReview.find(f)
    .sort({ box: -1 })
    .limit(2000)
    .populate('employeeId', 'full_name name job_title_en job_title_ar department')
    .lean();
}

function highPotentials(opts) {
  return reviewsInBoxes({ ...opts, boxes: grid.HIPO_BOXES });
}
function risks(opts) {
  return reviewsInBoxes({ ...opts, boxes: grid.RISK_BOXES });
}

async function getByEmployee({ branchId, employeeId, reviewCycle } = {}) {
  const TalentReview = getModel('TalentReview', '../../models/HR/TalentReview');
  if (!TalentReview) return null;
  const f = { employeeId, ...scopeFilter({ branchId, reviewCycle }) };
  return TalentReview.findOne(f).populate('employeeId', 'full_name name department').lean();
}

module.exports = {
  derivePerformanceBand,
  upsertReview,
  gridSummary,
  reviewsInBoxes,
  highPotentials,
  risks,
  getByEmployee,
};
