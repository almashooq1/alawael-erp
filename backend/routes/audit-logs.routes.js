/**
 * Audit Logs Routes — سجل التدقيق المُوحّد
 * /api/v1/audit-logs/*
 * Wraps queryAuditLogs from auditTrail.middleware.
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, st) => res.status(st || 200).json({ success: true, data });

let queryAuditLogs;
try {
  ({ queryAuditLogs } = require('../middleware/auditTrail.middleware'));
} catch {
  queryAuditLogs = async () => ({ entries: [], total: 0, source: 'unavailable' });
}

// List with filters
router.get('/', async (req, res) => {
  try {
    const result = await queryAuditLogs(req.query || {});
    ok(res, result);
  } catch {
    ok(res, { entries: [], total: 0, source: 'error' });
  }
});

// Stats summary
router.get('/stats', async (_req, res) => {
  try {
    const result = await queryAuditLogs({ limit: 1000 });
    const byAction = {};
    const bySeverity = {};
    (result.entries || []).forEach(e => {
      byAction[e.action] = (byAction[e.action] || 0) + 1;
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
    });
    ok(res, { total: result.total || 0, byAction, bySeverity });
  } catch {
    ok(res, { total: 0, byAction: {}, bySeverity: {} });
  }
});

// User-specific audit
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await queryAuditLogs({ ...req.query, userId: req.params.userId });
    ok(res, result);
  } catch {
    ok(res, { entries: [], total: 0 });
  }
});

// Filter by entity/model
router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const result = await queryAuditLogs({
      ...req.query,
      entityType: req.params.entityType,
      entityId: req.params.entityId,
    });
    ok(res, result);
  } catch {
    ok(res, { entries: [], total: 0 });
  }
});

// Severity filter
router.get('/severity/:level', async (req, res) => {
  try {
    const result = await queryAuditLogs({ ...req.query, severity: req.params.level });
    ok(res, result);
  } catch {
    ok(res, { entries: [], total: 0 });
  }
});

module.exports = router;
