'use strict';

/**
 * alerts-workflow.routes.js — Wave 15.
 *
 * Operator-facing action surface for the Alert & Priority Engine.
 * Every endpoint maps 1:1 onto a method of `AlertWorkflowService`
 * (Wave 12). The route layer's job is narrow:
 *
 *   - Parse + validate the request body
 *   - Pull actor context from the authenticated user
 *   - Translate service result codes into HTTP status codes
 *
 * Status code mapping (consistent across all endpoints):
 *
 *   service result                  HTTP
 *   -----------------------------   -----
 *   { ok: true, alert }             200
 *   { ok: true, noop: true }        200  (idempotent — same payload, different telemetry)
 *   { ok: false, reason: 'NOT_FOUND' }            404
 *   { ok: false, reason: 'ALREADY_RESOLVED' }     409
 *   { ok: false, reason: 'ASSIGNEE_REQUIRED' }    400
 *   { ok: false, reason: 'INVALID_SNOOZE_DURATION' } 400
 *   { ok: false, reason: 'INVALID_MUTE_DURATION' }   400
 *   { ok: false, reason: 'MUTE_REASON_REQUIRED' }    400
 *   { ok: false, reason: 'COMMENT_TEXT_REQUIRED' }   400
 *   { ok: false, reason: 'COMMENT_TEXT_TOO_LONG' }   413
 *   { ok: false, reason: 'RESOLVE_NOTE_TOO_LONG' }   413
 *   { ok: false, reason: 'ACTOR_REQUIRED' }          401
 *
 * Authorization happens upstream (the router is mounted behind the
 * `authenticate` middleware in app.js). Fine-grained role gating
 * lives on individual routes that warrant it (mute requires
 * branch_manager+; everyone authenticated can ack/comment).
 */

const express = require('express');
const safeError = require('../utils/safeError');

const REASON_TO_STATUS = Object.freeze({
  NOT_FOUND: 404,
  ALREADY_RESOLVED: 409,
  ASSIGNEE_REQUIRED: 400,
  INVALID_SNOOZE_DURATION: 400,
  INVALID_MUTE_DURATION: 400,
  MUTE_REASON_REQUIRED: 400,
  COMMENT_TEXT_REQUIRED: 400,
  COMMENT_TEXT_TOO_LONG: 413,
  RESOLVE_NOTE_TOO_LONG: 413,
  ACTOR_REQUIRED: 401,
  UNKNOWN_RULE: 404,
});

function respond(res, result) {
  if (result && result.ok) {
    return res.json({ success: true, data: result });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'WORKFLOW_REJECTED',
    reason: result?.reason,
  });
}

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    ip: req.ip,
  };
}

const MUTE_ALLOWED_ROLES = new Set([
  'admin',
  'super_admin',
  'manager',
  'branch_manager',
  'head_office_admin',
  'compliance_officer',
  'dpo',
  'it_admin',
]);

function requireMutePermission(req, res, next) {
  const role = req.user?.role || req.user?.roleCode || '';
  if (!MUTE_ALLOWED_ROLES.has(role)) {
    return res.status(403).json({
      success: false,
      message: 'كتم التنبيهات يحتاج صلاحية مدير الفرع أو أعلى',
    });
  }
  return next();
}

/**
 * @param {object} opts
 *   - workflow:  AlertWorkflowService instance (Wave 12 factory output)
 *   - alertModel: defaults to canonical model (used for /timeline only)
 *   - logger:    console-compatible
 */
function createAlertsWorkflowRouter({ workflow, alertModel = null, logger = console } = {}) {
  if (!workflow || typeof workflow.acknowledgeAlert !== 'function') {
    throw new Error('alerts-workflow.routes: workflow service is required');
  }
  // `logger` is captured for future use (route-level diagnostics);
  // referenced via void to satisfy the lint rule.
  void logger;

  const router = express.Router();

  // POST /:id/acknowledge — stops escalation, keeps alert OPEN.
  router.post('/:id/acknowledge', async (req, res) => {
    try {
      const result = await workflow.acknowledgeAlert({
        alertId: req.params.id,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'alerts.acknowledge');
    }
  });

  // POST /:id/assign — { assigneeUserId }
  router.post('/:id/assign', async (req, res) => {
    try {
      const { assigneeUserId } = req.body || {};
      const result = await workflow.assignAlert({
        alertId: req.params.id,
        assigneeUserId,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'alerts.assign');
    }
  });

  // POST /:id/snooze — { minutes, reason? }
  router.post('/:id/snooze', async (req, res) => {
    try {
      const { minutes, reason } = req.body || {};
      const result = await workflow.snoozeAlert({
        alertId: req.params.id,
        minutes: Number(minutes),
        reason: typeof reason === 'string' ? reason : null,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'alerts.snooze');
    }
  });

  // POST /:id/mute — { hours, reason } — gated to branch_manager+.
  router.post('/:id/mute', requireMutePermission, async (req, res) => {
    try {
      const { hours, reason } = req.body || {};
      const result = await workflow.muteAlert({
        alertId: req.params.id,
        hours: Number(hours),
        reason,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'alerts.mute');
    }
  });

  // POST /:id/resolve — { note? }
  router.post('/:id/resolve', async (req, res) => {
    try {
      const { note } = req.body || {};
      const result = await workflow.resolveAlertManually({
        alertId: req.params.id,
        note: typeof note === 'string' ? note : null,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'alerts.resolve');
    }
  });

  // POST /:id/comments — { text }
  router.post('/:id/comments', async (req, res) => {
    try {
      const { text } = req.body || {};
      const result = await workflow.commentAlert({
        alertId: req.params.id,
        text,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'alerts.comment');
    }
  });

  // GET /:id/timeline — chronological state.transitions + comments.
  // Returns a single merged feed sorted DESC so the latest event
  // appears first (matches the UI design pattern §7.3).
  router.get('/:id/timeline', async (req, res) => {
    try {
      const Model =
        (alertModel && (alertModel.model || alertModel)) || require('../alerts/alert.model').model;
      const alert = await Model.findById(req.params.id).lean();
      if (!alert) {
        return res.status(404).json({ success: false, message: 'NOT_FOUND' });
      }
      const transitions = Array.isArray(alert.state?.transitions) ? alert.state.transitions : [];
      const comments = Array.isArray(alert.comments) ? alert.comments : [];
      const reopens = Array.isArray(alert.reopens) ? alert.reopens : [];

      const events = [
        ...transitions.map(t => ({
          kind: 'state_transition',
          at: t.at,
          from: t.from,
          to: t.to,
          byUserId: t.byUserId,
          byRole: t.byRole,
          reason: t.reason,
        })),
        ...comments.map(c => ({
          kind: 'comment',
          at: c.at,
          byUserId: c.byUserId,
          byRole: c.byRole,
          text: c.text,
        })),
        ...reopens.map(r => ({
          kind: 'reopen',
          at: r.reopenedAt,
          previousResolvedAt: r.previousResolvedAt,
          reason: r.reason,
        })),
      ].sort((a, b) => new Date(b.at) - new Date(a.at));

      return res.json({
        success: true,
        data: {
          alertId: alert._id,
          ruleId: alert.ruleId,
          currentState: alert.state?.current || 'OPEN',
          currentTier: alert.escalation?.currentTier || 1,
          events,
        },
      });
    } catch (err) {
      return safeError(res, err, 'alerts.timeline');
    }
  });

  return router;
}

module.exports = { createAlertsWorkflowRouter, REASON_TO_STATUS };
