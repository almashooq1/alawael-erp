'use strict';
/**
 * SessionManager Routes
 * Auto-extracted from services/dddSessionManager.js
 * 7 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getSessionDashboard, getActiveSessions, createSession, terminateSession, terminateAllUserSessions, enforceSessionLimits, cleanExpiredSessions } = require('../services/dddSessionManager');

  router.get('/sessions-mgmt/dashboard', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, ...(await getSessionDashboard()) });
    } catch (e) {
      safeError(res, e, 'session-manager');
    }
  });

  router.get('/sessions-mgmt/active', authenticate, async (req, res) => {
    try {
    const userId = req.query.userId || req.user?._id;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    const sessions = await getActiveSessions(userId);
    res.json({ success: true, count: sessions.length, sessions });
    } catch (e) {
      safeError(res, e, 'session-manager');
    }
  });

  router.post('/sessions-mgmt/create', authenticate, async (req, res) => {
    try {
    const ua = parseUserAgent(req.headers['user-agent']);
    const session = await createSession({
    ...req.body,
    userId: req.body.userId || req.user?._id,
    ip: req.ip,
    device: { ...ua, fingerprint: generateDeviceFingerprint(req), name: req.body.deviceName },
    });
    res.status(201).json({ success: true, session });
    } catch (e) {
      safeError(res, e, 'session-manager');
    }
  });

  router.post('/sessions-mgmt/:sessionId/terminate', authenticate, async (req, res) => {
    try {
    const result = await terminateSession(req.params.sessionId, req.user?._id, req.body.reason);
    res.json({ success: true, session: result });
    } catch (e) {
      safeError(res, e, 'session-manager');
    }
  });

  router.post('/sessions-mgmt/terminate-all', authenticate, async (req, res) => {
    try {
    const userId = req.body.userId || req.user?._id;
    const result = await terminateAllUserSessions(
    userId,
    req.body.exceptSessionId,
    req.user?._id
    );
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'session-manager');
    }
  });

  router.post('/sessions-mgmt/enforce-limits', authenticate, async (req, res) => {
    try {
    const userId = req.body.userId || req.user?._id;
    const result = await enforceSessionLimits(userId, req.body.maxSessions);
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'session-manager');
    }
  });

  router.post('/sessions-mgmt/clean-expired', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, ...(await cleanExpiredSessions()) });
    } catch (e) {
      safeError(res, e, 'session-manager');
    }
  });

module.exports = router;
