/**
 * Phase 9 C14 — Pure report builders for the 5 Phase-9 rehab reports.
 *
 * No DB, no I/O — pure functions that take already-fetched inputs and
 * return structured report documents. The calling route/service is
 * responsible for loading beneficiary / goals / progress / reviews
 * (typically via goalProgressService, carePlanReviewService, etc.) and
 * handing them in.
 *
 * Keeps the presentation layer (PDF / UI / email export) free to
 * transform one of these JSON shapes without re-querying.
 *
 * Reports:
 *   1. buildIrpSnapshot        — full IRP state at a point in time
 *   2. buildFamilyUpdate       — parent-friendly progress summary
 *   3. buildDisciplineReportCard — per-discipline rollup for a period
 *   4. buildDischargeSummary   — end-of-program synthesis
 *   5. buildReviewComplianceReport — overdue-review watch for mgmt
 */

const progressEngine = require('./progressEngine');

function nowIso() {
  return new Date().toISOString();
}

function safeId(obj) {
  if (!obj) return null;
  if (obj._id) return String(obj._id);
  if (obj.id) return String(obj.id);
  return null;
}

function beneficiaryStub(beneficiary) {
  const b = beneficiary || {};
  return {
    id: safeId(b),
    fullName: b.fullName || b.name || null,
    age:
      typeof b.age === 'number'
        ? b.age
        : b.dateOfBirth
          ? Math.floor(
              (Date.now() - new Date(b.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)
            )
          : null,
  };
}

function progressBlock(goal, entries = []) {
  const trend = progressEngine.computeTrend(goal, entries);
  const velocity = progressEngine.computeVelocity(goal, entries);
  return {
    goalId: safeId(goal),
    templateCode: goal.templateCode || null,
    disciplineId: goal.disciplineId || null,
    description: goal.description || goal.title || null,
    baseline: goal.baseline ?? null,
    target: goal.target ?? null,
    current:
      entries.length > 0
        ? (entries[entries.length - 1].measuredValue ??
          entries[entries.length - 1].value ??
          entries[entries.length - 1].score ??
          null)
        : null,
    trend,
    velocity,
    mastered: progressEngine.isMastered(goal, entries),
  };
}

function buildIrpSnapshot({
  beneficiary,
  carePlan,
  goals = [],
  progressByGoal = {},
  reviews = [],
}) {
  const goalBlocks = goals.map(g => progressBlock(g, progressByGoal[safeId(g)] || []));
  return {
    reportType: 'IRP_SNAPSHOT',
    generatedAt: nowIso(),
    beneficiary: beneficiaryStub(beneficiary),
    carePlanId: safeId(carePlan),
    disciplinesInvolved: Array.from(new Set(goalBlocks.map(b => b.disciplineId).filter(Boolean))),
    goalCount: goalBlocks.length,
    masteredCount: goalBlocks.filter(b => b.mastered).length,
    goals: goalBlocks,
    latestReview: reviews.length > 0 ? reviews[reviews.length - 1] : null,
  };
}

function buildFamilyUpdate({ beneficiary, goals = [], progressByGoal = {} }) {
  const highlights = [];
  const concerns = [];
  goals.forEach(g => {
    const block = progressBlock(g, progressByGoal[safeId(g)] || []);
    if (block.mastered || block.trend === 'IMPROVING') highlights.push(block);
    else if (block.trend === 'DECLINING' || block.trend === 'STALLED') concerns.push(block);
  });
  return {
    reportType: 'FAMILY_UPDATE',
    generatedAt: nowIso(),
    beneficiary: beneficiaryStub(beneficiary),
    summary: {
      totalGoals: goals.length,
      mastered: highlights.filter(h => h.mastered).length,
      improving: highlights.filter(h => !h.mastered).length,
      needsAttention: concerns.length,
    },
    highlights,
    concerns,
  };
}

function buildDisciplineReportCard({ disciplineId, period, goals = [], progressByGoal = {} }) {
  const scoped = goals.filter(g => g.disciplineId === disciplineId);
  const blocks = scoped.map(g => progressBlock(g, progressByGoal[safeId(g)] || []));
  const trendCounts = { IMPROVING: 0, STABLE: 0, DECLINING: 0, STALLED: 0 };
  blocks.forEach(b => {
    if (trendCounts[b.trend] !== undefined) trendCounts[b.trend] += 1;
  });
  return {
    reportType: 'DISCIPLINE_REPORT_CARD',
    generatedAt: nowIso(),
    disciplineId,
    period: period || null,
    goalCount: blocks.length,
    mastered: blocks.filter(b => b.mastered).length,
    trendCounts,
    goals: blocks,
  };
}

function buildDischargeSummary({
  beneficiary,
  carePlan,
  goals = [],
  progressByGoal = {},
  reviews = [],
}) {
  const blocks = goals.map(g => progressBlock(g, progressByGoal[safeId(g)] || []));
  const masteredCount = blocks.filter(b => b.mastered).length;
  const unmetCount = blocks.filter(b => !b.mastered).length;
  return {
    reportType: 'DISCHARGE_SUMMARY',
    generatedAt: nowIso(),
    beneficiary: beneficiaryStub(beneficiary),
    carePlanId: safeId(carePlan),
    enrolledFrom: carePlan?.startDate || null,
    dischargedAt: carePlan?.endDate || carePlan?.dischargedAt || null,
    totals: {
      goalCount: blocks.length,
      masteredCount,
      unmetCount,
      masteryRate: blocks.length > 0 ? Number((masteredCount / blocks.length).toFixed(2)) : 0,
    },
    reviewCount: reviews.length,
    goals: blocks,
  };
}

function buildReviewComplianceReport({ reviews = [], now = new Date() }) {
  const nowMs = now.getTime();
  let overdue = 0;
  let dueSoon = 0;
  let upToDate = 0;
  const overdueList = [];
  reviews.forEach(r => {
    const due = r.dueAt ? new Date(r.dueAt).getTime() : null;
    if (due == null) return;
    if (r.status === 'COMPLETED' || r.completedAt) {
      upToDate += 1;
      return;
    }
    const diffDays = (due - nowMs) / (24 * 3600 * 1000);
    if (diffDays < 0) {
      overdue += 1;
      overdueList.push({
        reviewId: safeId(r),
        carePlanId: r.carePlanId || null,
        dueAt: r.dueAt,
        daysOverdue: Math.floor(-diffDays),
      });
    } else if (diffDays <= 7) {
      dueSoon += 1;
    } else {
      upToDate += 1;
    }
  });
  return {
    reportType: 'REVIEW_COMPLIANCE',
    generatedAt: nowIso(),
    totals: { reviewCount: reviews.length, overdue, dueSoon, upToDate },
    overdueList,
  };
}

module.exports = {
  buildIrpSnapshot,
  buildFamilyUpdate,
  buildDisciplineReportCard,
  buildDischargeSummary,
  buildReviewComplianceReport,
};
