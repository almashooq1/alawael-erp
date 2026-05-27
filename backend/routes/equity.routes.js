'use strict';

/**
 * equity.routes.js — W489 (Phase G: Equity Engine REST surface).
 *
 * REST exposes the W484-W488 equity engine for supervisor + admin
 * triage. All routes require role-based auth + branch isolation via
 * `branchFilter(req)` from W269 isolation doctrine.
 *
 *   GET   /api/equity/alerts          — list with filters (status/severity/dim)
 *   GET   /api/equity/alerts/:id      — single alert
 *   PATCH /api/equity/alerts/:id      — transition status / assign / annotate
 *   POST  /api/equity/alerts/:id/dismiss — terminal dismiss (requires reason)
 *   POST  /api/equity/audit           — manual ad-hoc audit (tier 2 MFA)
 *   GET   /api/equity/benchmarks      — list outcome benchmarks
 *
 * Per ADR-019 MFA tier discipline: dismiss + manual audit require tier 2.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const { branchFilter, effectiveBranchScope } = require('../middleware/branchScope.middleware');
const { assertBranchMatch } = require('../middleware/assertBranchMatch');
const { requireMfaTier } = require('../middleware/requireMfaTier');

const VALID_STATUSES = [
  'open',
  'acknowledged',
  'investigating',
  'remediation_in_progress',
  'resolved',
  'monitoring',
  'dismissed',
];
const VALID_SEVERITIES = ['none', 'minor', 'moderate', 'major'];

router.use(authenticateToken);

function loadAlertModel() {
  try {
    return mongoose.model('EquityDisparityAlert');
  } catch {
    return null;
  }
}

function loadBenchmarkModel() {
  try {
    return mongoose.model('OutcomeBenchmark');
  } catch {
    return null;
  }
}

/**
 * GET /api/equity/alerts
 * Filters: status, severity, dimension, metricKind, branchId (cross-branch only)
 */
router.get(
  '/alerts',
  requireRole(['admin', 'supervisor', 'quality_lead', 'compliance']),
  async (req, res) => {
    const Alert = loadAlertModel();
    if (!Alert) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    const filter = { ...branchFilter(req) };
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.severity && VALID_SEVERITIES.includes(req.query.severity)) {
      filter.overallSeverity = req.query.severity;
    }
    if (req.query.dimension) filter.dimension = req.query.dimension;
    if (req.query.metricKind) filter.metricKind = req.query.metricKind;

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.skip, 10) || 0;

    try {
      const [items, total] = await Promise.all([
        Alert.find(filter).sort({ detectedAt: -1 }).skip(skip).limit(limit).lean(),
        Alert.countDocuments(filter),
      ]);
      res.json({ success: true, items, total, limit, skip });
    } catch (err) {
      res.status(500).json({ success: false, code: 'LIST_FAILED', message: err.message });
    }
  }
);

/**
 * GET /api/equity/alerts/:id
 */
router.get(
  '/alerts/:id',
  requireRole(['admin', 'supervisor', 'quality_lead', 'compliance']),
  async (req, res) => {
    const Alert = loadAlertModel();
    if (!Alert) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    try {
      const alert = await Alert.findById(req.params.id).lean();
      if (!alert) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      assertBranchMatch(req, alert.branchId, 'EquityDisparityAlert');
      res.json({ success: true, alert });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      res.status(500).json({ success: false, code: 'GET_FAILED', message: err.message });
    }
  }
);

/**
 * PATCH /api/equity/alerts/:id
 * Body: { status?, assignedTo?, rootCauseHypothesis?, notes? }
 */
router.patch(
  '/alerts/:id',
  requireRole(['admin', 'supervisor', 'quality_lead']),
  async (req, res) => {
    const Alert = loadAlertModel();
    if (!Alert) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    const updates = {};
    if (req.body.status && VALID_STATUSES.includes(req.body.status)) {
      // dismiss must go through /dismiss endpoint (reason required)
      if (req.body.status === 'dismissed') {
        return res.status(400).json({
          success: false,
          code: 'USE_DISMISS_ENDPOINT',
          message: 'Use POST /alerts/:id/dismiss with a reason',
        });
      }
      updates.status = req.body.status;
    }
    if (req.body.assignedTo) updates.assignedTo = req.body.assignedTo;
    if (typeof req.body.rootCauseHypothesis === 'string') {
      updates.rootCauseHypothesis = req.body.rootCauseHypothesis.slice(0, 2000);
    }
    if (typeof req.body.notes === 'string') {
      updates.notes = req.body.notes.slice(0, 5000);
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, code: 'NO_UPDATES' });
    }

    try {
      const existing = await Alert.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      assertBranchMatch(req, existing.branchId, 'EquityDisparityAlert');

      Object.assign(existing, updates);
      await existing.save();
      res.json({ success: true, alert: existing.toObject() });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      res.status(500).json({ success: false, code: 'PATCH_FAILED', message: err.message });
    }
  }
);

/**
 * POST /api/equity/alerts/:id/dismiss — tier 2 MFA
 * Body: { dismissalReason }
 */
router.post(
  '/alerts/:id/dismiss',
  requireRole(['admin', 'supervisor', 'compliance']),
  requireMfaTier(2),
  async (req, res) => {
    const Alert = loadAlertModel();
    if (!Alert) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    const reason = (req.body.dismissalReason || '').toString();
    if (reason.length < 5) {
      return res.status(400).json({ success: false, code: 'REASON_TOO_SHORT' });
    }

    try {
      const existing = await Alert.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      assertBranchMatch(req, existing.branchId, 'EquityDisparityAlert');

      existing.status = 'dismissed';
      existing.dismissalReason = reason.slice(0, 1000);
      await existing.save();
      res.json({ success: true, alert: existing.toObject() });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      res.status(500).json({ success: false, code: 'DISMISS_FAILED', message: err.message });
    }
  }
);

/**
 * POST /api/equity/alerts/:id/retry-capa — tier 1 MFA
 * Body: {} — ensures a CAPA exists for this alert. Creates one if
 * missing (major severity only), returns existing if already linked.
 * Idempotent. Used to backfill alerts created before W503 or to recover
 * from auto-creation failures.
 */
router.post(
  '/alerts/:id/retry-capa',
  requireRole(['admin', 'supervisor', 'quality_lead', 'compliance']),
  requireMfaTier(1),
  async (req, res) => {
    const engineService = require('../services/equity/equity-engine.service');
    const Alert = loadAlertModel();
    if (!Alert) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    try {
      const alert = await Alert.findById(req.params.id).lean();
      if (!alert) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      assertBranchMatch(req, alert.branchId, 'EquityDisparityAlert');

      const result = await engineService.ensureCapaForAlert(req.params.id);
      const status = result.reason === 'ALREADY_LINKED' ? 200 : 201;
      return res.status(status).json({ success: true, ...result });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      if (err.code === 'ALERT_NOT_FOUND') {
        return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      }
      return res
        .status(500)
        .json({ success: false, code: 'RETRY_CAPA_FAILED', message: err.message });
    }
  }
);

/**
 * POST /api/equity/audit — tier 2 MFA
 * Body: { dimension, metricKind, observations, periodStart, periodEnd, branchId? }
 * Runs an ad-hoc audit + persists alert if severity >= moderate.
 */
router.post(
  '/audit',
  requireRole(['admin', 'supervisor', 'quality_lead', 'compliance']),
  requireMfaTier(2),
  async (req, res) => {
    const engineService = require('../services/equity/equity-engine.service');
    const branchId = req.body.branchId || effectiveBranchScope(req);
    if (!branchId) {
      return res.status(400).json({ success: false, code: 'BRANCH_ID_REQUIRED' });
    }
    // If the caller specified a different branch, must be allowed
    if (req.body.branchId) {
      try {
        assertBranchMatch(req, req.body.branchId, 'audit branchId');
      } catch (err) {
        if (err.statusCode === 403) {
          return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
        }
        throw err;
      }
    }

    try {
      const result = await engineService.runAuditAndPersist({
        branchId,
        dimension: req.body.dimension,
        metricKind: req.body.metricKind,
        observations: req.body.observations,
        periodStart: req.body.periodStart,
        periodEnd: req.body.periodEnd,
        periodKind: req.body.periodKind || 'ad-hoc',
        generatedBy: 'manual_audit',
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, code: 'AUDIT_FAILED', message: err.message });
    }
  }
);

/**
 * GET /api/equity/benchmarks
 * Filters: scope, metricKind, status
 */
router.get(
  '/benchmarks',
  requireRole(['admin', 'supervisor', 'quality_lead', 'compliance']),
  async (req, res) => {
    const Benchmark = loadBenchmarkModel();
    if (!Benchmark) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    const filter = {};
    if (req.query.scope) filter.scope = req.query.scope;
    if (req.query.metricKind) filter.metricKind = req.query.metricKind;
    if (req.query.status) filter.status = req.query.status;

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    try {
      const items = await Benchmark.find(filter).sort({ periodEnd: -1 }).limit(limit).lean();
      res.json({ success: true, items, total: items.length });
    } catch (err) {
      res.status(500).json({ success: false, code: 'LIST_FAILED', message: err.message });
    }
  }
);

module.exports = router;
