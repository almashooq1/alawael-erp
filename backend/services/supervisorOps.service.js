'use strict';

const mongoose = require('mongoose');

/**
 * supervisorOps.service.js — READ-ONLY operational-workflow layer (W1169).
 * ════════════════════════════════════════════════════════════════════
 * Models the therapist workflow CYCLE the center runs digitally:
 *   receive task → run session → DOCUMENT → complete.
 *
 * The clinical session model has a status (scheduled/in_progress/completed/…)
 * but NOT the supervisor's "In-Process vs Complete" distinction: a session can
 * be status='completed' (the visit happened) yet carry NO documentation
 * (empty SOAP + no goalProgress) — i.e. it is still "awaiting documentation".
 * This service derives that workflow state (read-only) so a supervisor can see
 * the documentation backlog and per-therapist daily throughput.
 *
 * Read-only: only .find().lean(). No mutation. The session model is resolved
 * lazily via mongoose.model() so the pure classifiers unit-test without a DB.
 */

// The workflow-cycle states (supervisor board): everything before 'documented'
// is "In-Process"; 'documented' is "Complete".
const WORKFLOW_STATES = Object.freeze([
  'scheduled', // assigned, not started
  'in_progress', // checked-in / session running
  'awaiting_documentation', // visit happened (status=completed) but NOT documented
  'documented', // completed AND documented — the closed cycle
  'no_show',
  'cancelled',
]);

/**
 * PURE — has this session been documented? (SOAP filled OR goal progress logged).
 * @param {object} s
 * @returns {boolean}
 */
function isDocumented(s) {
  if (!s) return false;
  if (Array.isArray(s.goalProgress) && s.goalProgress.length > 0) return true;
  const fields = [s.soapNotes, s.subjective, s.objective, s.assessment, s.plan];
  return fields.some(f => typeof f === 'string' && f.trim().length > 0);
}

/**
 * PURE — classify one session into a workflow-cycle state.
 * @param {object} s
 * @returns {string|null}
 */
function classifySessionWorkflowState(s) {
  if (!s) return null;
  switch (s.status) {
    case 'cancelled':
    case 'late_cancel':
    case 'rescheduled':
      return 'cancelled';
    case 'no_show':
      return 'no_show';
    case 'completed':
      return isDocumented(s) ? 'documented' : 'awaiting_documentation';
    case 'in_progress':
      return 'in_progress';
    default:
      return 'scheduled'; // scheduled / confirmed
  }
}

/**
 * PURE — fold a set of sessions into a supervisor daily board.
 * @param {object[]} sessions
 * @returns {{ total:number, counts:object, completed:number, documentedRate:number, deliveredMinutes:number, awaitingDocumentation:any[] }}
 */
function summarizeDailyOps(sessions) {
  const list = Array.isArray(sessions) ? sessions : [];
  const counts = Object.fromEntries(WORKFLOW_STATES.map(k => [k, 0]));
  let deliveredMinutes = 0;
  const awaitingDocumentation = [];

  for (const s of list) {
    const state = classifySessionWorkflowState(s);
    if (state) counts[state] += 1;
    if (state === 'documented' || state === 'awaiting_documentation') {
      deliveredMinutes += typeof s.actualDurationMinutes === 'number' ? s.actualDurationMinutes : 0;
    }
    if (state === 'awaiting_documentation') {
      awaitingDocumentation.push({
        sessionId: s._id,
        beneficiaryId: s.beneficiaryId,
        scheduledDate: s.scheduledDate,
      });
    }
  }

  const completed = counts.documented + counts.awaiting_documentation;
  return {
    total: list.length,
    counts,
    completed, // sessions that actually happened (documented + awaiting)
    documentedRate: completed > 0 ? Math.round((counts.documented / completed) * 100) : 100,
    deliveredMinutes, // therapy minutes delivered (actual duration of sessions that happened)
    awaitingDocumentation, // the "In-Process" tail the supervisor chases
  };
}

const DOC_SELECT =
  'status soapNotes subjective objective assessment plan goalProgress actualDurationMinutes beneficiaryId therapistId scheduledDate branchId';

/**
 * READ-ONLY — a therapist's daily workflow board for one day.
 * @param {string|ObjectId} therapistId
 * @param {{ date?: string|Date }} [opts]
 */
async function dailyBoardForTherapist(therapistId, opts = {}) {
  const ClinicalSession = mongoose.model('ClinicalSession');
  const day = opts.date ? new Date(opts.date) : new Date();
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  const sessions = await ClinicalSession.find({
    therapistId,
    isDeleted: { $ne: true },
    scheduledDate: { $gte: start, $lte: end },
  })
    .select(DOC_SELECT)
    .lean();

  return {
    therapistId: String(therapistId),
    date: start,
    ...summarizeDailyOps(sessions),
  };
}

/**
 * READ-ONLY — the documentation backlog across a branch over a recent window:
 * sessions that HAPPENED (status=completed) but are still un-documented, grouped
 * by therapist. This is the supervisor's "In-Process" chase list.
 * @param {{ branchId?: string|ObjectId, sinceDays?: number }} [opts]
 */
async function documentationBacklog(opts = {}) {
  const ClinicalSession = mongoose.model('ClinicalSession');
  const sinceDays = Number.isFinite(opts.sinceDays) && opts.sinceDays > 0 ? opts.sinceDays : 7;
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  const q = { status: 'completed', isDeleted: { $ne: true }, scheduledDate: { $gte: since } };
  if (opts.branchId) q.branchId = opts.branchId;

  const sessions = await ClinicalSession.find(q).select(DOC_SELECT).lean();
  const awaiting = sessions.filter(
    s => classifySessionWorkflowState(s) === 'awaiting_documentation'
  );

  const byTherapist = {};
  for (const s of awaiting) {
    const k = String(s.therapistId);
    (byTherapist[k] = byTherapist[k] || []).push({
      sessionId: s._id,
      beneficiaryId: s.beneficiaryId,
      scheduledDate: s.scheduledDate,
    });
  }

  return {
    windowDays: sinceDays,
    completedScanned: sessions.length,
    awaitingCount: awaiting.length,
    documentedRate:
      sessions.length > 0
        ? Math.round(((sessions.length - awaiting.length) / sessions.length) * 100)
        : 100,
    byTherapist,
  };
}

module.exports = {
  WORKFLOW_STATES,
  isDocumented,
  classifySessionWorkflowState,
  summarizeDailyOps,
  dailyBoardForTherapist,
  documentationBacklog,
};
