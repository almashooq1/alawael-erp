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
const { branchFilter, requireBranchAccess } = require('../middleware/branchScope.middleware');
const { assertBranchMatch, effectiveBranchScope } = require('../middleware/assertBranchMatch');
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
const VALID_BENCHMARK_METRICS = [
  'gas_avg_tscore',
  'icf_avg_qualifier',
  'session_attendance_rate',
  'goal_achievement_rate',
  'wait_time_days',
  'complaint_rate',
  'wbci_avg',
];

router.use(authenticateToken);
// W833: populate req.branchScope so branchFilter(req) + assertBranchMatch(req)
// below actually enforce isolation (they no-op without it).
router.use(requireBranchAccess);

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

function loadClinicalAssessmentModel() {
  try {
    return mongoose.model('ClinicalAssessment');
  } catch {
    try {
      return require('../models/ClinicalAssessment');
    } catch {
      return null;
    }
  }
}

function allowedBranchIds(req) {
  if (!req.branchScope || req.branchScope.allBranches) return null;
  if (Array.isArray(req.branchScope.branchIds) && req.branchScope.branchIds.length) {
    return req.branchScope.branchIds.map(String);
  }
  if (req.branchScope.branchId) return [String(req.branchScope.branchId)];
  return [];
}

function buildBenchmarkListFilter(req, baseFilter = {}) {
  const filter = { ...baseFilter };
  const allowed = allowedBranchIds(req);
  if (allowed == null) return filter;
  const branchMatch = allowed.length > 1 ? { $in: allowed } : allowed[0] || null;

  if (filter.scope === 'branch') {
    // Restricted users querying branch benchmarks should only see their own branch scope.
    filter.branchId = branchMatch;
    return filter;
  }

  if (!filter.scope) {
    filter.$or = [{ scope: { $ne: 'branch' } }, { scope: 'branch', branchId: branchMatch }];
  }
  return filter;
}

function parseDateBoundary(value, endOfDay = false) {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  if (endOfDay) dt.setHours(23, 59, 59, 999);
  return dt;
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
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
  '/benchmarks/compare',
  requireRole(['admin', 'supervisor', 'quality_lead', 'compliance']),
  async (req, res) => {
    const Benchmark = loadBenchmarkModel();
    const ClinicalAssessment = loadClinicalAssessmentModel();
    if (!Benchmark) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });
    if (!ClinicalAssessment) {
      return res.status(503).json({ success: false, code: 'ASSESSMENT_MODEL_NOT_REGISTERED' });
    }

    const targetBranchId = req.query.branchId || effectiveBranchScope(req);
    if (!targetBranchId || !mongoose.isValidObjectId(targetBranchId)) {
      return res.status(400).json({
        success: false,
        code: 'BRANCH_ID_REQUIRED',
        message: 'branchId is required and must be valid for benchmark comparison',
      });
    }

    try {
      assertBranchMatch(req, targetBranchId, 'OutcomeBenchmark compare branch');
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      return res.status(400).json({ success: false, code: 'INVALID_BRANCH_SCOPE' });
    }

    const metricKind = req.query.metricKind || 'gas_avg_tscore';
    if (!VALID_BENCHMARK_METRICS.includes(metricKind)) {
      return res.status(400).json({ success: false, code: 'INVALID_METRIC_KIND' });
    }

    const targetBranchObjectId = new mongoose.Types.ObjectId(targetBranchId);
    const from = parseDateBoundary(req.query.from);
    const to = parseDateBoundary(req.query.to, true);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const dateFilter = {
      $gte: from || ninetyDaysAgo,
      ...(to ? { $lte: to } : {}),
    };
    const assessmentFilter = {
      branchId: targetBranchObjectId,
      score: { $ne: null },
      assessmentDate: dateFilter,
      ...(req.query.tool ? { tool: String(req.query.tool) } : {}),
    };

    try {
      const [observedStats, benchmarkRows] = await Promise.all([
        ClinicalAssessment.aggregate([
          { $match: assessmentFilter },
          {
            $group: {
              _id: null,
              observations: { $sum: 1 },
              observedMean: { $avg: '$score' },
              latestAssessmentDate: { $max: '$assessmentDate' },
            },
          },
        ]).exec(),
        Benchmark.find({
          metricKind,
          status: 'published',
          $or: [{ scope: 'branch', branchId: targetBranchObjectId }, { scope: 'national' }],
        })
          .sort({ periodEnd: -1 })
          .lean(),
      ]);

      const selectedBenchmark =
        benchmarkRows.find(
          row => row.scope === 'branch' && String(row.branchId || '') === String(targetBranchId)
        ) || benchmarkRows.find(row => row.scope === 'national');
      if (!selectedBenchmark) {
        return res.status(404).json({ success: false, code: 'BENCHMARK_NOT_FOUND' });
      }

      const stats = observedStats[0] || null;
      if (!stats || !Number.isFinite(stats.observedMean)) {
        return res.json({
          success: true,
          data: {
            branchId: targetBranchId,
            metricKind,
            observations: 0,
            observedMean: null,
            benchmark: selectedBenchmark,
            targetStatus: 'insufficient_data',
          },
        });
      }

      const targetValue =
        selectedBenchmark.targetValue != null
          ? selectedBenchmark.targetValue
          : selectedBenchmark.centralTendency;
      const gap = round2(stats.observedMean - targetValue);
      const higherBetter = selectedBenchmark.targetDirection !== 'lower_better';
      const meetsTarget = higherBetter
        ? stats.observedMean >= targetValue
        : stats.observedMean <= targetValue;
      const gapBand =
        Math.abs(gap) <= 2 ? 'aligned' : Math.abs(gap) <= 5 ? 'moderate_gap' : 'major_gap';

      return res.json({
        success: true,
        data: {
          branchId: targetBranchId,
          metricKind,
          observations: stats.observations,
          observedMean: round2(stats.observedMean),
          latestAssessmentDate: stats.latestAssessmentDate,
          benchmark: selectedBenchmark,
          targetValue: round2(targetValue),
          gap,
          meetsTarget,
          gapBand,
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, code: 'COMPARE_FAILED', message: err.message });
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
    if (req.query.branchId) {
      if (!mongoose.isValidObjectId(req.query.branchId)) {
        return res.status(400).json({ success: false, code: 'INVALID_BRANCH_ID' });
      }
      try {
        assertBranchMatch(req, req.query.branchId, 'OutcomeBenchmark list branch');
      } catch (err) {
        if (err.statusCode === 403) {
          return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
        }
        throw err;
      }
      filter.scope = 'branch';
      filter.branchId = req.query.branchId;
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    try {
      const items = await Benchmark.find(buildBenchmarkListFilter(req, filter))
        .sort({ periodEnd: -1 })
        .limit(limit)
        .lean();
      res.json({ success: true, items, total: items.length });
    } catch (err) {
      res.status(500).json({ success: false, code: 'LIST_FAILED', message: err.message });
    }
  }
);

module.exports = router;
