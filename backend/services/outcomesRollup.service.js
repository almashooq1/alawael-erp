'use strict';

/**
 * outcomesRollup.service.js — W1214 (Blueprint 43, §6.4 + R7: تجميع المخرجات)
 *
 * The roll-up ladder that turns individual goal outcomes into the
 * institutional argument (للتأمين والجهات التنظيمية والاعتماد):
 *
 *   هدف فردي (GAS/MCID)
 *      └─► مستفيد   (% أهداف محققة + متوسط التقدّم)
 *           └─► برنامج/تخصص (goal.domain — متوسط التحسّن لكل تخصص)
 *                └─► فرع    (مخرجات مجمّعة)
 *                     └─► المركز (صف لكل فرع + إجمالي تنفيذي)
 *
 * READ-ONLY — pure aggregation over TherapeuticGoal (the canonical goal model
 * per ADR-040). The branch tier complements operations-health (W1195/W1196):
 * that snapshot answers "هل العمليات سليمة هذا الأسبوع؟", this ladder answers
 * "ما المخرجات المتراكمة؟". Pure shapers exported for unit tests.
 */

const mongoose = require('mongoose');

/** Goal statuses considered CLOSED with a positive clinical outcome. */
const ACHIEVED_STATUSES = Object.freeze(['achieved']);
/** Goal statuses considered CLOSED (outcome known, good or bad). */
const CLOSED_STATUSES = Object.freeze([
  'achieved',
  'partially_achieved',
  'not_achieved',
  'discontinued',
]);

function model(name) {
  return mongoose.model(name);
}

/* ─────────────────────────── pure shapers ─────────────────────────── */

/**
 * PURE — fold raw {status, currentProgress, domain} goal rows into one
 * topline: counts, achievement rate (over CLOSED goals only — open goals
 * can't have "failed" yet), and mean progress of ACTIVE goals.
 */
function foldGoals(rows = []) {
  const byStatus = {};
  const byDomain = new Map();
  let activeProgressSum = 0;
  let activeCount = 0;

  for (const g of rows) {
    const status = g.status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    const domain = g.domain || 'other';
    if (!byDomain.has(domain)) {
      byDomain.set(domain, { domain, total: 0, achieved: 0, closed: 0, progressSum: 0, active: 0 });
    }
    const d = byDomain.get(domain);
    d.total += 1;
    if (ACHIEVED_STATUSES.includes(status)) d.achieved += 1;
    if (CLOSED_STATUSES.includes(status)) d.closed += 1;
    if (status === 'active') {
      d.active += 1;
      if (typeof g.currentProgress === 'number') {
        d.progressSum += g.currentProgress;
        activeProgressSum += g.currentProgress;
      }
      activeCount += 1;
    }
  }

  const total = rows.length;
  const achieved = byStatus.achieved || 0;
  const closed = CLOSED_STATUSES.reduce((s, st) => s + (byStatus[st] || 0), 0);

  return {
    total,
    byStatus,
    closed,
    achieved,
    achievedPctOfClosed: closed > 0 ? Math.round((achieved / closed) * 100) : null,
    activeCount,
    avgActiveProgress: activeCount > 0 ? Math.round(activeProgressSum / activeCount) : null,
    byDomain: [...byDomain.values()]
      .map(d => ({
        domain: d.domain,
        total: d.total,
        achieved: d.achieved,
        closed: d.closed,
        achievedPctOfClosed: d.closed > 0 ? Math.round((d.achieved / d.closed) * 100) : null,
        active: d.active,
        avgActiveProgress: d.active > 0 ? Math.round(d.progressSum / d.active) : null,
      }))
      .sort((a, b) => b.total - a.total),
  };
}

/* ─────────────────────────── ladder tiers ─────────────────────────── */

const GOAL_FIELDS = 'status currentProgress domain beneficiaryId branchId';
const GOAL_FILTER_BASE = Object.freeze({ isDeleted: { $ne: true } });

/** Tier 1 — beneficiary. */
async function rollupForBeneficiary(beneficiaryId) {
  const TherapeuticGoal = model('TherapeuticGoal');
  const rows = await TherapeuticGoal.find({ ...GOAL_FILTER_BASE, beneficiaryId })
    .select(GOAL_FIELDS)
    .limit(2000)
    .lean();
  return {
    tier: 'beneficiary',
    beneficiaryId: String(beneficiaryId),
    generatedAt: new Date(),
    ...foldGoals(rows),
  };
}

/** Tier 2+3 — branch with the per-program (domain) breakdown built in. */
async function rollupForBranch(branchId) {
  const TherapeuticGoal = model('TherapeuticGoal');
  const rows = await TherapeuticGoal.find({ ...GOAL_FILTER_BASE, branchId })
    .select(GOAL_FIELDS)
    .limit(20000)
    .lean();
  const beneficiaries = new Set(rows.map(r => String(r.beneficiaryId))).size;
  return {
    tier: 'branch',
    branchId: String(branchId),
    generatedAt: new Date(),
    beneficiariesWithGoals: beneficiaries,
    ...foldGoals(rows),
  };
}

/** Tier 4 — center: one row per branch + the executive topline. */
async function rollupForCenter() {
  const TherapeuticGoal = model('TherapeuticGoal');
  const rows = await TherapeuticGoal.find({ ...GOAL_FILTER_BASE })
    .select(GOAL_FIELDS)
    .limit(50000)
    .lean();

  const byBranch = new Map();
  for (const g of rows) {
    const key = g.branchId ? String(g.branchId) : 'unassigned';
    if (!byBranch.has(key)) byBranch.set(key, []);
    byBranch.get(key).push(g);
  }

  const branches = [...byBranch.entries()]
    .map(([branchId, branchRows]) => {
      const folded = foldGoals(branchRows);
      return {
        branchId,
        beneficiariesWithGoals: new Set(branchRows.map(r => String(r.beneficiaryId))).size,
        total: folded.total,
        achieved: folded.achieved,
        closed: folded.closed,
        achievedPctOfClosed: folded.achievedPctOfClosed,
        activeCount: folded.activeCount,
        avgActiveProgress: folded.avgActiveProgress,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    tier: 'center',
    generatedAt: new Date(),
    branchCount: branches.length,
    branches,
    center: foldGoals(rows),
  };
}

module.exports = {
  ACHIEVED_STATUSES,
  CLOSED_STATUSES,
  foldGoals,
  rollupForBeneficiary,
  rollupForBranch,
  rollupForCenter,
};
