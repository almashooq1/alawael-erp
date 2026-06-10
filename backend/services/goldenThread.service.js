'use strict';

const mongoose = require('mongoose');

/**
 * goldenThread.service.js — READ-ONLY golden-thread traversal.
 * ════════════════════════════════════════════════════════════════════
 * Assembles, for ONE beneficiary, the connected clinical graph by walking the
 * model-ref edges closed/locked+indexed across this arc:
 *
 *   assessment (MeasureApplication, W1151 measureApplicationId)
 *        └─► goal (TherapeuticGoal)
 *              ├─► measures (objectives[].measureLinks, W1090/W235)
 *              ├─► sessions (ClinicalSession.goalProgress[].goalId, W1149 — reverse, indexed)
 *              └─► baseline + outcome (baseline.value + progressHistory, W1145)
 *
 * This is the STRUCTURAL graph (model refs), distinct from CareTimeline (the
 * append-only EVENT stream). It is the first consumer of the reverse-traversal
 * indexes added in W1149/W1151/W1153/W1154 — turning "the thread is traversable"
 * into "here is the thread."
 *
 * Read-only: only .find().lean(). No mutation, safe to call freely. Models are
 * resolved lazily via mongoose.model() so unit tests can run the pure assembler
 * without a connection.
 */

const THREAD_STAGES = Object.freeze([
  'no_measure_link',
  'linked_no_baseline',
  'linked_no_outcome',
  'complete',
]);

/**
 * PURE — assemble the connected graph from pre-fetched plain data. No DB / no
 * I/O, so it is unit-testable in isolation.
 * @param {{ goals?: any[], sessionsByGoalId?: Record<string, any[]>, applicationsById?: Record<string, any> }} data
 * @returns {{ threads: any[], summary: object }}
 */
function assembleThread(data = {}) {
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const sessionsByGoalId = data.sessionsByGoalId || {};
  const applicationsById = data.applicationsById || {};

  const threads = goals.map(g => {
    const goalId = String(g._id);
    const objectives = Array.isArray(g.objectives) ? g.objectives : [];
    const measureLinks = objectives
      .flatMap(o => (Array.isArray(o.measureLinks) ? o.measureLinks : []))
      .filter(l => l && l.status !== 'unlinked')
      .map(l => ({ measureId: l.measureId, measureCode: l.measureCode, linkType: l.linkType }));

    const sessions = (sessionsByGoalId[goalId] || []).map(s => ({
      sessionId: s._id,
      scheduledDate: s.scheduledDate,
      status: s.status,
    }));

    const sourceAssessment = g.measureApplicationId
      ? applicationsById[String(g.measureApplicationId)] || {
          _id: g.measureApplicationId,
          resolved: false,
        }
      : null;

    const hasMeasure = measureLinks.length > 0;
    const hasBaseline = !!(
      g.baseline &&
      g.baseline.value !== undefined &&
      g.baseline.value !== null
    );
    const hasOutcome =
      (Array.isArray(g.progressHistory) && g.progressHistory.length > 0) ||
      (typeof g.currentProgress === 'number' && g.currentProgress > 0);

    let threadStage;
    if (!hasMeasure) threadStage = 'no_measure_link';
    else if (!hasBaseline) threadStage = 'linked_no_baseline';
    else if (!hasOutcome) threadStage = 'linked_no_outcome';
    else threadStage = 'complete';

    return {
      goalId: g._id,
      title: g.title || null,
      status: g.status || null,
      currentProgress: typeof g.currentProgress === 'number' ? g.currentProgress : 0,
      measureLinks,
      sessionCount: sessions.length,
      sessions,
      sourceAssessment,
      baseline: g.baseline || null,
      threadStage,
    };
  });

  const summary = {
    goalCount: threads.length,
    completeCount: threads.filter(t => t.threadStage === 'complete').length,
    noMeasureCount: threads.filter(t => t.threadStage === 'no_measure_link').length,
    sessionLinkedCount: threads.filter(t => t.sessionCount > 0).length,
    assessmentDerivedCount: threads.filter(t => t.sourceAssessment).length,
  };

  return { threads, summary };
}

// W1158 — Smart Attention Queue: each break-stage maps to ONE concrete next
// action (lower priority number = more urgent / earlier in the thread). This is
// deterministic guidance — "الذكاء يقترح، الإنسان يقرّر" — not automation.
const ACTION_BY_STAGE = Object.freeze({
  no_measure_link: {
    priority: 1,
    code: 'LINK_MEASURE',
    action: 'اربط مقياساً أساسياً (PRIMARY) بالهدف — لا يمكن حساب المخرجات بدونه',
  },
  linked_no_baseline: {
    priority: 2,
    code: 'CAPTURE_BASELINE',
    action: 'سجّل قياس خط الأساس — التغيّر/MCID غير قابل للحساب بدونه',
  },
  linked_no_outcome: {
    priority: 3,
    code: 'RECORD_PROGRESS',
    action: 'سجّل تقدّم الهدف في جلسة — حلقة المخرَج لم تُغلق بعد',
  },
});

/**
 * PURE — derive a prioritized next-best-action list from a thread trace. Each
 * goal stuck at a break-stage yields one concrete action; a fully-linked goal
 * with zero recorded sessions is flagged for review. Sorted most-urgent first.
 * @param {{ threads?: any[] }} trace
 * @returns {Array<{ goalId:any, title:any, priority:number, code:string, action:string }>}
 */
function deriveNextActions(trace) {
  const threads = (trace && Array.isArray(trace.threads) && trace.threads) || [];
  const actions = [];
  for (const t of threads) {
    const rule = ACTION_BY_STAGE[t.threadStage];
    if (rule) {
      actions.push({ goalId: t.goalId, title: t.title, ...rule });
    } else if (t.threadStage === 'complete' && t.sessionCount === 0) {
      actions.push({
        goalId: t.goalId,
        title: t.title,
        priority: 4,
        code: 'NO_SESSIONS',
        action: 'هدف مكتمل الربط دون جلسات مسجّلة — جدوِل/سجّل جلسة لربط التقدّم بالجلسات',
      });
    }
  }
  return actions.sort((a, b) => a.priority - b.priority);
}

/**
 * Trace the full golden thread for a beneficiary (READ-ONLY).
 * @param {string|ObjectId} beneficiaryId
 * @returns {Promise<{ beneficiaryId: string, generatedAt: Date, threads: any[], summary: object, nextActions: any[] }>}
 */
async function traceByBeneficiary(beneficiaryId) {
  const TherapeuticGoal = mongoose.model('TherapeuticGoal');
  const ClinicalSession = mongoose.model('ClinicalSession');

  const goals = await TherapeuticGoal.find({ beneficiaryId, isDeleted: { $ne: true } })
    .select('title status currentProgress objectives baseline progressHistory measureApplicationId')
    .lean();

  const goalIds = goals.map(g => g._id);

  // Reverse traversal — sessions that targeted these goals (W1149 index).
  const sessions = goalIds.length
    ? await ClinicalSession.find({
        'goalProgress.goalId': { $in: goalIds },
        isDeleted: { $ne: true },
      })
        .select('scheduledDate status goalProgress.goalId')
        .lean()
    : [];

  const sessionsByGoalId = {};
  const goalIdSet = new Set(goalIds.map(String));
  for (const s of sessions) {
    for (const gp of s.goalProgress || []) {
      const k = String(gp.goalId);
      if (!goalIdSet.has(k)) continue; // a session may touch other beneficiaries' goals
      (sessionsByGoalId[k] = sessionsByGoalId[k] || []).push(s);
    }
  }

  // Source assessments (W1151 measureApplicationId). Optional model — degrade gracefully.
  const appIds = [
    ...new Set(
      goals
        .map(g => g.measureApplicationId)
        .filter(Boolean)
        .map(String)
    ),
  ];
  let applicationsById = {};
  if (appIds.length) {
    try {
      const MeasureApplication = mongoose.model('MeasureApplication');
      const apps = await MeasureApplication.find({ _id: { $in: appIds } })
        .select('measureId applicationDate assessmentId')
        .lean();
      applicationsById = Object.fromEntries(apps.map(a => [String(a._id), a]));
    } catch (_err) {
      /* MeasureApplication not registered in this context — leave unresolved */
    }
  }

  const { threads, summary } = assembleThread({ goals, sessionsByGoalId, applicationsById });
  const result = {
    beneficiaryId: String(beneficiaryId),
    generatedAt: new Date(),
    threads,
    summary,
  };
  result.nextActions = deriveNextActions(result); // W1158 — Smart Attention Queue
  result.summary.attentionCount = result.nextActions.length;
  return result;
}

module.exports = { traceByBeneficiary, assembleThread, deriveNextActions, THREAD_STAGES };
