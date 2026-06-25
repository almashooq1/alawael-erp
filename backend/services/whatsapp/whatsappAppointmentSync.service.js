/**
 * WhatsApp Appointment Sync — مزامنة حالة الموعد من محادثة واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Staff-mediated two-way appointment sync: while chatting with a family on
 * WhatsApp, staff can cancel a session or mark it as a no-show straight from the
 * Inbox. The ACTUAL mutation is delegated to the sessions domain facade
 * (`require('../../domains/sessions').service`) — the same battle-tested
 * methods that emit the canonical `session.cancelled` / `session.no_show`
 * events through serviceEventBridge → timeline. We never touch ClinicalSession
 * directly, so domain validation + events stay intact.
 *
 * Branch isolation: the route resolves the conversation branch-scoped and the
 * session's branchId is re-checked here against effectiveBranchScope.
 *
 * Scope (W1497): cancel + no_show (the two actions that keep the schedule
 * accurate + reduce no-shows). `confirm` has no clean facade method yet and is
 * a follow-up.
 *
 * @module services/whatsapp/whatsappAppointmentSync.service
 */

'use strict';

const mongoose = require('mongoose');

const ACTIONS = Object.freeze(['cancel', 'no_show']);

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

// ─── Pure helpers (exported for the drift guard) ─────────────────────────────

function isValidAction(action) {
  return ACTIONS.includes(action);
}

// Cancel captures a reason natively (→ cancellation.reason). Keep it bounded.
function normalizeReason(reason) {
  if (reason == null) return undefined;
  const t = String(reason).trim().slice(0, 1000);
  return t || undefined;
}

// Shape the updated session for the API response. Pure + testable.
function summarizeSession(s) {
  if (!s) return null;
  return {
    id: String(s._id),
    status: s.status || null,
    scheduledDate: s.scheduledDate || null,
    attendanceStatus: (s.attendance && s.attendance.status) || null,
  };
}

// Resolve the sessions domain facade service lazily — it is instantiated during
// boot (SessionsDomain.initialize sets `.service`); at request time it is set.
function getSessionsService() {
  const domain = require('../../domains/sessions');
  const service = domain && domain.service;
  if (!service || typeof service.cancelSession !== 'function') {
    throw httpError('sessions domain not ready', 503);
  }
  return service;
}

/**
 * Apply a staff-initiated appointment action to one session.
 *
 * @param {object} opts
 * @param {string|ObjectId} opts.beneficiaryId - owner of the conversation
 * @param {string} opts.sessionId
 * @param {'cancel'|'no_show'} opts.action
 * @param {string} [opts.reason]
 * @param {string|null} [opts.branchScope] - effectiveBranchScope(req)
 * @param {string|ObjectId} [opts.actorId] - req.user id (lastModifiedBy)
 * @returns {Promise<object>} summarized session
 */
async function applyAppointmentAction(opts = {}) {
  const { beneficiaryId, sessionId, action, reason, branchScope, actorId } = opts;

  if (!isValidAction(action)) throw httpError('invalid action (cancel | no_show)', 400);
  if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
    throw httpError('a valid sessionId is required', 400);
  }

  const sessionsService = getSessionsService();

  // Ownership + branch verification against the conversation's beneficiary.
  const session = await sessionsService.getSessionById(sessionId);
  if (!session) throw httpError('Session not found', 404);
  if (beneficiaryId && String(session.beneficiaryId) !== String(beneficiaryId)) {
    throw httpError('Session does not belong to this beneficiary', 403);
  }
  if (branchScope && session.branchId && String(session.branchId) !== String(branchScope)) {
    throw httpError('Cross-branch access denied', 403);
  }

  let updated;
  if (action === 'cancel') {
    updated = await sessionsService.cancelSession(
      sessionId,
      normalizeReason(reason) || 'تم الإلغاء عبر واتساب',
      actorId || null
    );
  } else {
    // no_show — facade markNoShow sets status + attendance.status='absent' and
    // emits session.no_show. (Absence reason, if any, stays in the WhatsApp
    // thread; capturing it on the session is a follow-up.)
    updated = await sessionsService.markNoShow(sessionId, actorId || null);
  }

  return summarizeSession(updated);
}

module.exports = {
  applyAppointmentAction,
  // Pure helpers exported for the drift guard.
  isValidAction,
  normalizeReason,
  summarizeSession,
  ACTIONS,
};
