'use strict';

/**
 * measures-workflow.routes.js — Wave 226
 * ════════════════════════════════════════════════════════════════════
 * HTTP surface for the measures workflow stack (W218 → W225).
 *
 * Endpoints (all under /api/v1/measures-workflow):
 *
 *   Selection (W218):
 *     POST   /strategist/recommend          → ranked measure picks
 *
 *   Event triggers (W220):
 *     POST   /triggers/:eventCode/fire      → fire clinical event
 *     GET    /triggers/:eventCode/preview   → what would fire
 *
 *   Lifecycle (W222):
 *     GET    /tasks                         → list tasks (by phase)
 *     POST   /tasks/:taskId/acknowledge     → clinician ack
 *     POST   /tasks/:taskId/review-breach   → QA breach review
 *
 *   Readiness gates (W223):
 *     GET    /readiness/care-plan-review/:beneficiaryId
 *     GET    /readiness/discharge/:beneficiaryId
 *     GET    /required-measures/:beneficiaryId
 *
 *   Reminders (W225):
 *     GET    /reminders/beneficiary/:beneficiaryId
 *
 * All routes require authenticate + requireBranchAccess. Admin/cron
 * mutation endpoints (lifecycle tick, gap-auditor scan, reminder
 * dispatch) are intentionally NOT exposed here — they run from
 * scheduled jobs only, not as ad-hoc HTTP.
 *
 * Each route stays thin: parse → call service → respond. Service
 * errors with known reason codes return 400; everything else 500
 * via safeError.
 * ════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const {
  enforceBeneficiaryBranch,
  effectiveBranchScope,
} = require('../middleware/assertBranchMatch');
const logger = require('../utils/logger');

const strategist = require('../services/measureSelectionStrategist.service');
const triggerSvc = require('../services/reassessmentTriggerService.service');
const lifecycle = require('../services/reassessmentLifecycle.service');
const readinessGate = require('../services/measureReadinessGate.service');
const cascade = require('../services/reassessmentReminderCascade.service');
const linkageInsights = require('../services/goalLinkageInsights.service');
const linkage = require('../services/goalMeasureLinkage.service');
const measureAdmin = require('../services/measureAdministration.service');
const { MeasureReassessmentTask } = require('../domains/goals/models/MeasureReassessmentTask');

// All routes authenticated + branch-scoped.
router.use(authenticate);
router.use(requireBranchAccess);

// ─── Helpers ───────────────────────────────────────────────────────────

function _toErrorResponse(err) {
  // Service-level validation errors land here with a recognisable prefix.
  const msg = err && err.message ? String(err.message) : 'unknown error';
  // W269e: explicit 403/503 from assertBranchMatch / enforceBeneficiaryBranch.
  if (err && err.status === 403) {
    return { status: 403, body: { success: false, error: msg } };
  }
  if (err && err.status === 503) {
    return {
      status: 503,
      body: { success: false, error: 'models_unavailable', message: msg },
    };
  }
  if (err && err.status === 404) {
    return { status: 404, body: { success: false, error: msg } };
  }
  if (msg.match(/required|invalid|must be|cannot be|missing|not found/i)) {
    return { status: 400, body: { success: false, error: msg } };
  }
  // W257h-followup: safeError() signature is (res, err, context) — the
  // previous one-arg call here ALWAYS crashed on the 500 path because
  // it ran err.stack lookups against undefined `res`. Inline a
  // production-safe body instead. Same fix pattern as W241 routes.
  logger.error(`[measures-workflow] unexpected error: ${msg}`, { stack: err && err.stack });
  const body = {
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'حدث خطأ داخلي' : msg,
  };
  return { status: 500, body };
}

// ════════════════════════════════════════════════════════════════════════
// W218 — Selection strategist
// ════════════════════════════════════════════════════════════════════════

/**
 * POST /strategist/recommend
 * Body: { beneficiary, discipline?, clinicalQuestion?, domain?, ... }
 */
router.post('/strategist/recommend', async (req, res) => {
  try {
    const out = await strategist.recommend(req.body || {});
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W220 — Event triggers
// ════════════════════════════════════════════════════════════════════════

/**
 * POST /triggers/:eventCode/fire
 * Body: { beneficiaryId, payload?, bypassCooldown?, ... }
 */
router.post('/triggers/:eventCode/fire', async (req, res) => {
  try {
    const out = await triggerSvc.fire({
      type: req.params.eventCode,
      ...(req.body || {}),
      actor: req.body?.actor || { userId: req.user?._id },
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /triggers/:eventCode/preview
 * Returns the measures that would fire (no side effects).
 */
router.get('/triggers/:eventCode/preview', async (req, res) => {
  try {
    const measures = await triggerSvc.previewMeasuresFor(req.params.eventCode);
    res.json({ success: true, data: { eventCode: req.params.eventCode, measures } });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W222 — Lifecycle (read + clinician actions)
// ════════════════════════════════════════════════════════════════════════

/**
 * GET /tasks?phase=X&branchId=Y&statusIn=pending,acknowledged
 */
router.get('/tasks', async (req, res) => {
  try {
    const phase = req.query.phase || undefined;
    const branchId = effectiveBranchScope(req) || undefined;
    const statusIn = req.query.statusIn
      ? String(req.query.statusIn)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : undefined;
    const list = await lifecycle.listByPhase({ phase, branchId, statusIn });
    res.json({ success: true, data: list });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * POST /tasks/:taskId/acknowledge
 */
router.post('/tasks/:taskId/acknowledge', async (req, res) => {
  try {
    const task = await lifecycle.acknowledgeTask({
      taskId: req.params.taskId,
      actor: { userId: req.user?._id },
    });
    res.json({ success: true, data: task });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * POST /tasks/:taskId/review-breach
 * Body: { notes? }
 */
router.post('/tasks/:taskId/review-breach', async (req, res) => {
  try {
    const task = await lifecycle.reviewBreach({
      taskId: req.params.taskId,
      actor: { userId: req.user?._id },
      notes: req.body?.notes,
    });
    res.json({ success: true, data: task });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W223 — Readiness gates
// ════════════════════════════════════════════════════════════════════════

/**
 * GET /readiness/care-plan-review/:beneficiaryId
 *
 * Optional query: ?freshnessWindowDays=N&requiredMeasureIds=id1,id2
 */
router.get('/readiness/care-plan-review/:beneficiaryId', async (req, res) => {
  try {
    await enforceBeneficiaryBranch(req, req.params.beneficiaryId);
    const out = await readinessGate.gateCarePlanReview({
      beneficiaryId: req.params.beneficiaryId,
      freshnessWindowDays: req.query.freshnessWindowDays
        ? Number(req.query.freshnessWindowDays)
        : undefined,
      requiredMeasureIds: req.query.requiredMeasureIds
        ? String(req.query.requiredMeasureIds).split(',').filter(Boolean)
        : undefined,
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /readiness/discharge/:beneficiaryId
 */
router.get('/readiness/discharge/:beneficiaryId', async (req, res) => {
  try {
    await enforceBeneficiaryBranch(req, req.params.beneficiaryId);
    const out = await readinessGate.gateDischarge({
      beneficiaryId: req.params.beneficiaryId,
      freshnessWindowDays: req.query.freshnessWindowDays
        ? Number(req.query.freshnessWindowDays)
        : undefined,
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /required-measures/:beneficiaryId
 */
router.get('/required-measures/:beneficiaryId', async (req, res) => {
  try {
    await enforceBeneficiaryBranch(req, req.params.beneficiaryId);
    const list = await readinessGate.listRequiredMeasures({
      beneficiaryId: req.params.beneficiaryId,
    });
    res.json({ success: true, data: list });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W225 — Reminders (read-only — dispatch is cron-only)
// ════════════════════════════════════════════════════════════════════════

/**
 * GET /reminders/beneficiary/:beneficiaryId
 * Returns reminder notifications fired for this beneficiary.
 */
router.get('/reminders/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    await enforceBeneficiaryBranch(req, req.params.beneficiaryId);
    const list = await cascade.listForBeneficiary(req.params.beneficiaryId);
    res.json({ success: true, data: list });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W237/W238 — Linkage insights (read-only)
// ════════════════════════════════════════════════════════════════════════

/**
 * GET /insights/orphaned-measures?branchId=&limit=
 * Active measures with zero ACTIVE goal-measure links — archival
 * candidates for governance review.
 */
router.get('/insights/orphaned-measures', async (req, res) => {
  try {
    const limit = req.query.limit ? Math.min(500, Math.max(1, Number(req.query.limit))) : 50;
    const out = await linkageInsights.findOrphanedMeasures({
      branchId: effectiveBranchScope(req) || undefined,
      limit,
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /insights/overloaded-measures?branchId=&threshold=&limit=
 * Measures linked to more than `threshold` distinct goals — concentration
 * risk if the measure deprecates.
 */
router.get('/insights/overloaded-measures', async (req, res) => {
  try {
    const threshold = req.query.threshold ? Math.max(1, Number(req.query.threshold)) : 50;
    const limit = req.query.limit ? Math.min(500, Math.max(1, Number(req.query.limit))) : 50;
    const out = await linkageInsights.findOverloadedMeasures({
      branchId: effectiveBranchScope(req) || undefined,
      threshold,
      limit,
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /insights/kpis?branchId=&rationaleMinChars=
 * Org-wide governance KPIs for `/admin/ops/goal-linkage` dashboard.
 */
router.get('/insights/kpis', async (req, res) => {
  try {
    const rationaleMinChars = req.query.rationaleMinChars
      ? Math.max(1, Number(req.query.rationaleMinChars))
      : 20;
    const out = await linkageInsights.linkageKpis({
      branchId: effectiveBranchScope(req) || undefined,
      rationaleMinChars,
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /insights/link-type-distribution?branchId=
 * Counts per linkType (PRIMARY/SECONDARY/SCREENING_ONLY/PROXY/
 * CONTRAINDICATED), excludes unlinked.
 */
router.get('/insights/link-type-distribution', async (req, res) => {
  try {
    const out = await linkageInsights.linkTypeDistribution({
      branchId: effectiveBranchScope(req) || undefined,
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W235/W239 — Goal-Measure Linkage CRUD + decisions
// ════════════════════════════════════════════════════════════════════════

/**
 * POST /goals/:goalId/objectives/:objectiveIndex/links
 * Body: { measureId, linkType, weight?, expectedTarget?,
 *         reviewIntervalDays?, mcidExpectation?, interventionRefs,
 *         linkRationale }
 */
router.post('/goals/:goalId/objectives/:objectiveIndex/links', async (req, res) => {
  try {
    const objectiveIndex = Number(req.params.objectiveIndex);
    const out = await linkage.createLink({
      goalId: req.params.goalId,
      objectiveIndex,
      ...(req.body || {}),
      actor: { userId: req.user?._id },
    });
    res.status(201).json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * POST /goals/:goalId/objectives/:objectiveIndex/links/:linkIndex/review
 * Body: { verdict, notes?, interpretationCategorySnapshot? }
 * SoD: first reviewer must differ from linkedBy
 */
router.post(
  '/goals/:goalId/objectives/:objectiveIndex/links/:linkIndex/review',
  async (req, res) => {
    try {
      const objectiveIndex = Number(req.params.objectiveIndex);
      const linkIndex = Number(req.params.linkIndex);
      const out = await linkage.reviewLink({
        goalId: req.params.goalId,
        objectiveIndex,
        linkIndex,
        verdict: req.body?.verdict,
        notes: req.body?.notes,
        interpretationCategorySnapshot: req.body?.interpretationCategorySnapshot,
        // W247 — modify_target verdict accepts optional expectedTarget
        // payload (value/direction/changeFromBaseline/achievedByDate).
        expectedTarget: req.body?.expectedTarget,
        actor: { userId: req.user?._id },
      });
      res.json({ success: true, data: out });
    } catch (err) {
      const r = _toErrorResponse(err);
      res.status(r.status).json(r.body);
    }
  }
);

/**
 * POST /goals/:goalId/objectives/:objectiveIndex/links/:linkIndex/unlink
 * Body: { reason }
 * SoD: unlinker ≠ linkedBy
 */
router.post(
  '/goals/:goalId/objectives/:objectiveIndex/links/:linkIndex/unlink',
  async (req, res) => {
    try {
      const objectiveIndex = Number(req.params.objectiveIndex);
      const linkIndex = Number(req.params.linkIndex);
      const out = await linkage.unlinkLink({
        goalId: req.params.goalId,
        objectiveIndex,
        linkIndex,
        reason: req.body?.reason,
        actor: { userId: req.user?._id },
      });
      res.json({ success: true, data: out });
    } catch (err) {
      const r = _toErrorResponse(err);
      res.status(r.status).json(r.body);
    }
  }
);

/**
 * GET /goals/:goalId/objectives/:objectiveIndex/suggestions
 * Q2-Q6 bundled recommendations (modify / addSecondary / unlink /
 * closeAchieved / closeFailed).
 */
router.get('/goals/:goalId/objectives/:objectiveIndex/suggestions', async (req, res) => {
  try {
    const objectiveIndex = Number(req.params.objectiveIndex);
    const out = await linkage.suggestModifications({
      goalId: req.params.goalId,
      objectiveIndex,
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /goals/:goalId/weighted-progress
 * Per-objective weighted-score breakdown.
 */
router.get('/goals/:goalId/weighted-progress', async (req, res) => {
  try {
    const out = await linkage.computeWeightedProgress({ goalId: req.params.goalId });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /goals/:goalId/progress-history (W248)
 * Time-series of currentProgress for the trend chart on
 * /therapeutic-goals/[id]. Reads progressHistory[] populated by W216
 * measureGoalUpdater (which W236 + W248 enriched with currentProgressSnapshot).
 */
router.get('/goals/:goalId/progress-history', async (req, res) => {
  try {
    const out = await linkage.progressHistory({ goalId: req.params.goalId });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /measures/:measureId/goals?includeUnlinked=true
 * Reverse lookup — which goals reference this measure?
 */
router.get('/measures/:measureId/goals', async (req, res) => {
  try {
    const out = await linkage.goalsForMeasure({
      measureId: req.params.measureId,
      includeUnlinked: req.query.includeUnlinked === 'true',
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * GET /links/due-for-review?branchId=&withinDays=7
 */
router.get('/links/due-for-review', async (req, res) => {
  try {
    const withinDays = req.query.withinDays
      ? Math.max(1, Math.min(90, Number(req.query.withinDays)))
      : 7;
    const out = await linkage.dueForReview({
      branchId: effectiveBranchScope(req) || undefined,
      withinDays,
    });
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// W257h — Anomalous-admins triage list (surfaces W257e/W257f flags)
// ════════════════════════════════════════════════════════════════════════

/**
 * GET /anomalous-admins
 *
 * Query params:
 *   branchId?         scope to one branch (defaults to req.branchId)
 *   from?, to?        ISO-parsable date strings; bounds applicationDate
 *   severity?         'low'|'medium'|'high' — INCLUSIVE-or-greater
 *   flagType?         exact type filter (IMPOSSIBLY_FAST_ADMIN / etc.)
 *   includeSuperseded include status='corrected' admins
 *   limit?            max results, clamped [1, 500]
 *
 * Returns: { success: true, data: { items: [...], total } }
 */
router.get('/anomalous-admins', async (req, res) => {
  try {
    const opts = {
      branchId: effectiveBranchScope(req) || undefined,
      from: req.query.from || undefined,
      to: req.query.to || undefined,
      severity: req.query.severity || undefined,
      flagType: req.query.flagType || undefined,
      includeSuperseded:
        req.query.includeSuperseded === 'true' || req.query.includeSuperseded === '1',
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    const out = await measureAdmin.listAnomalousAdmins(opts);
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

/**
 * W257k — CSV export of the anomalous-admins triage list.
 *
 *   GET /anomalous-admins.csv?branchId=&from=&to=&severity=&flagType=&...
 *
 * Same data shape + filter semantics as the JSON sibling. Mirrors W258
 * pairs.csv: UTF-8 BOM (Excel auto-detects AR on Windows), AR headers,
 * RFC 4180 escape on commas/quotes/newlines. One row per admin —
 * multiple flags collapsed into a semicolon-joined cell so each
 * applicationDate stays on one row (otherwise pivot tables drift).
 */
router.get('/anomalous-admins.csv', async (req, res) => {
  try {
    const opts = {
      branchId: effectiveBranchScope(req) || undefined,
      from: req.query.from || undefined,
      to: req.query.to || undefined,
      severity: req.query.severity || undefined,
      flagType: req.query.flagType || undefined,
      includeSuperseded:
        req.query.includeSuperseded === 'true' || req.query.includeSuperseded === '1',
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    const out = await measureAdmin.listAnomalousAdmins(opts);
    const csv = _anomaliesToCsv(out);
    const stamp = new Date().toISOString().slice(0, 10);
    const scope = opts.branchId ? String(opts.branchId).slice(-8) : 'all';
    const filename = `anomalies-${scope}-${stamp}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send('﻿' + csv);
  } catch (err) {
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

// RFC 4180 cell escape — wrap when contains comma/quote/newline.
function _csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function _anomaliesToCsv(out) {
  const headers = [
    'تاريخ التطبيق',
    'الحالة',
    'المستفيد',
    'المقياس',
    'الفرع',
    'الدرجة الإجمالية',
    'الشدة الأعلى',
    'عدد العلامات',
    'أنواع العلامات',
  ];
  const SEV_ORDER = { high: 3, medium: 2, low: 1 };
  const rows = [headers.join(',')];
  const items = (out && out.items) || [];
  for (const it of items) {
    const flags = Array.isArray(it.anomalyFlags) ? it.anomalyFlags : [];
    // Highest severity present on this admin
    let topSev = '';
    let topRank = 0;
    for (const f of flags) {
      const r = SEV_ORDER[f && f.severity] || 0;
      if (r > topRank) {
        topRank = r;
        topSev = f.severity;
      }
    }
    // De-dup flag types within one admin so the "types" cell is concise
    const typesSet = new Set();
    for (const f of flags) if (f && f.type) typesSet.add(f.type);
    rows.push(
      [
        _csvCell(it.applicationDate ? String(it.applicationDate).slice(0, 10) : ''),
        _csvCell(it.status || ''),
        _csvCell(String(it.beneficiaryId || '')),
        _csvCell(String(it.measureId || '')),
        _csvCell(it.branchId ? String(it.branchId) : ''),
        _csvCell(it.totalRawScore == null ? '' : it.totalRawScore),
        _csvCell(topSev),
        _csvCell(flags.length),
        _csvCell(Array.from(typesSet).join(';')),
      ].join(',')
    );
  }
  return rows.join('\n') + '\n';
}

/**
 * W257l — Anomaly aggregates for trend tiles.
 *
 *   GET /anomalous-admins/aggregates?branchId=&from=&to=&bucket=week|month
 *
 * Same admin scope as W257h but bucketed by time. Answers "are
 * anomalies trending up or down?" — directors checking branch health
 * over time. Bucket defaults to 'week'. Date defaults to last 90d.
 */
router.get('/anomalous-admins/aggregates', async (req, res) => {
  try {
    const opts = {
      branchId: effectiveBranchScope(req) || undefined,
      from: req.query.from || undefined,
      to: req.query.to || undefined,
      bucket: req.query.bucket === 'month' ? 'month' : 'week',
      includeSuperseded:
        req.query.includeSuperseded === 'true' || req.query.includeSuperseded === '1',
    };
    const out = await measureAdmin.aggregateAnomalies(opts);
    res.json({ success: true, data: out });
  } catch (err) {
    const r = _toErrorResponse(err);
    res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════════
// Health
// ════════════════════════════════════════════════════════════════════════

router.get('/_health', (req, res) => {
  res.json({
    success: true,
    data: {
      wave: 'W226+W238+W239+W257h+W257k+W257l',
      mountedAt: 'measures-workflow',
      endpoints: 23,
      services: [
        'W218 strategist',
        'W220 triggers',
        'W222 lifecycle',
        'W223 readinessGate',
        'W225 reminders (read-only)',
        'W235 linkage CRUD + decisions',
        'W237 linkage insights',
        'W257h anomalous-admins triage',
        'W257k anomalous-admins CSV export',
        'W257l anomaly aggregates (trend)',
      ],
    },
  });
});

module.exports = router;
