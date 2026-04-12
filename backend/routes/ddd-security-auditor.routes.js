'use strict';
/**
 * SecurityAuditor Routes
 * Auto-extracted from services/dddSecurityAuditor.js
 * 9 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getSecurityDashboard, resolveSecurityEvent, getIPReputation, checkBruteForce } = require('../services/dddSecurityAuditor');
const { DDDSecurityEvent, DDDSecurityPolicy } = require('../models/DddSecurityAuditor');

  router.get('/security/dashboard', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, ...(await getSecurityDashboard()) });
    } catch (e) {
      safeError(res, e, 'security-auditor');
    }
  });

  router.get('/security/events', authenticate, async (req, res) => {
    try {
    const query = { isDeleted: { $ne: true } };
    if (req.query.type) query.eventType = req.query.type;
    if (req.query.severity) query.severity = req.query.severity;
    if (req.query.ip) query.ip = req.query.ip;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const events = await DDDSecurityEvent.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, count: events.length, events });
    } catch (e) {
      safeError(res, e, 'security-auditor');
    }
  });

  router.get('/security/events/:id', authenticate, async (req, res) => {
    try {
    const event = await DDDSecurityEvent.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    res.json({ success: true, event });
    } catch (e) {
      safeError(res, e, 'security-auditor');
    }
  });

  router.post('/security/events/:id/resolve', authenticate, async (req, res) => {
    try {
    const result = await resolveSecurityEvent(req.params.id, req.user?._id, req.body.resolution);
    res.json({ success: true, event: result });
    } catch (e) {
      safeError(res, e, 'security-auditor');
    }
  });

  router.get('/security/ip/:ip/reputation', authenticate, async (req, res) => {
    try {
    res.json({ success: true, ...(await getIPReputation(req.params.ip)) });
    } catch (e) {
      safeError(res, e, 'security-auditor');
    }
  });

  router.post('/security/check-brute-force', authenticate, async (req, res) => {
    try {
    res.json({ success: true, ...(await checkBruteForce(req.body.ip, req.body.userId)) });
    } catch (e) {
      safeError(res, e, 'security-auditor');
    }
  });

  router.get('/security/policies', authenticate, async (_req, res) => {
    try {
    const policies = await DDDSecurityPolicy.find({ isDeleted: { $ne: true } }).lean();
    res.json({
    success: true,
    count: policies.length,
    policies,
    builtinCount: BUILTIN_POLICIES.length,
    });
    } catch (e) {
      safeError(res, e, 'security-auditor');
    }
  });

  router.get('/security/policies/builtin', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'security-auditor');
    }
  });

  router.get('/security/threats/patterns', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'security-auditor');
    }
  });

module.exports = router;
