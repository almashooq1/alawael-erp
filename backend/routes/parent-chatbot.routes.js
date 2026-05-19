'use strict';

/**
 * parent-chatbot.routes.js — Wave 120 / P3.6 Phase 1.
 *
 * HTTP surface for the Parent Chatbot service.
 * Mounted at /api/v1/parent/chatbot behind the authenticate middleware.
 *
 * Routes:
 *   POST /ask                       ← parent submits a turn
 *   GET  /sessions/:sessionId       ← read a session (own session;
 *                                     admin perm bypasses ownership)
 *
 * Permissions:
 *   parent.chatbot.ask              POST /ask — guardians of any beneficiary
 *   parent.chatbot.read             GET — read own session (guardian)
 *   admin.chatbot.read              admin override on GET /sessions/:id
 */

const express = require('express');
const safeError = require('../utils/safeError');
const reg = require('../intelligence/parent-chatbot.registry');

const REASON_TO_STATUS = Object.freeze({
  PERMISSION_DENIED: 403,
  [reg.REASON.CHATBOT_UNAVAILABLE]: 503,
  [reg.REASON.MESSAGE_REQUIRED]: 400,
  [reg.REASON.MESSAGE_TOO_LONG]: 413,
  [reg.REASON.SESSION_NOT_FOUND]: 404,
  [reg.REASON.SESSION_NOT_OWNED]: 403,
  [reg.REASON.RESPONSE_FORBIDDEN_CONTENT]: 422,
});

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    ip: req.ip,
  };
}

function respond(res, result) {
  if (result && result.ok) {
    const { ok: _ok, ...data } = result;
    void _ok;
    return res.json({ success: true, data });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'CHATBOT_REJECTED',
    reason: result?.reason,
    ...(result?.details ? { details: result.details } : {}),
    ...(result?.message ? { error: result.message } : {}),
  });
}

/**
 * @param {object} opts
 * @param {object} opts.chatbotService — createParentChatbotService instance
 * @param {object} opts.governance     — governance service (hasPermission)
 * @param {object} [opts.logger]
 */
function createParentChatbotRouter({
  chatbotService = null,
  governance = null,
  logger = console,
} = {}) {
  if (!chatbotService || typeof chatbotService.ask !== 'function') {
    throw new Error('parent-chatbot.routes: chatbotService is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('parent-chatbot.routes: governance service is required');
  }
  void logger;

  const router = express.Router();

  function requirePerm(code) {
    return (req, res, next) => {
      const actor = actorFrom(req);
      if (!actor.userId) {
        return res
          .status(401)
          .json({ success: false, message: 'AUTH_REQUIRED', reason: 'AUTH_REQUIRED' });
      }
      if (!governance.hasPermission(actor.role, code)) {
        return res.status(403).json({
          success: false,
          message: 'PERMISSION_DENIED',
          reason: 'PERMISSION_DENIED',
          requiredPermission: code,
        });
      }
      return next();
    };
  }

  // POST /ask
  router.post('/ask', requirePerm('parent.chatbot.ask'), async (req, res) => {
    try {
      const actor = actorFrom(req);
      const body = req.body || {};
      const result = await chatbotService.ask({
        sessionId: body.sessionId || null,
        userId: actor.userId,
        beneficiaryId: body.beneficiaryId || null,
        message: body.message || '',
        branchId: body.branchId || null,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'parent.chatbot.ask');
    }
  });

  // GET /sessions/:sessionId
  router.get('/sessions/:sessionId', requirePerm('parent.chatbot.read'), async (req, res) => {
    try {
      const actor = actorFrom(req);
      const isAdmin = governance.hasPermission(actor.role, 'admin.chatbot.read');
      const result = await chatbotService.getSession(req.params.sessionId, {
        actorUserId: actor.userId,
        isAdmin,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'parent.chatbot.read');
    }
  });

  return router;
}

module.exports = {
  createParentChatbotRouter,
  REASON_TO_STATUS,
};
